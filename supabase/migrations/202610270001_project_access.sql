-- Administración gráfica de accesos por proyecto
-- Migración no destructiva: conserva proyectos, áreas, checklist y miembros existentes.
-- Ejecutar una sola vez en Supabase SQL Editor o mediante `supabase db push`.

begin;

-- Normaliza la tabla ya existente sin recrearla ni borrar datos.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.project_members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.project_members drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.project_members
  alter column role drop default;

alter table public.project_members
  alter column role type text using role::text;

alter table public.project_members
  alter column role set default 'viewer';

update public.project_members
set role = case lower(trim(role))
  when 'owner' then 'owner'
  when 'propietario' then 'owner'
  when 'admin' then 'admin'
  when 'administrator' then 'admin'
  when 'administrador' then 'admin'
  when 'editor' then 'editor'
  when 'viewer' then 'viewer'
  when 'visualizador' then 'viewer'
  else 'viewer'
end;

-- Elimina duplicados antes de asegurar una sola membresía por proyecto/usuario.
delete from public.project_members a
using public.project_members b
where a.project_id = b.project_id
  and a.user_id = b.user_id
  and a.ctid < b.ctid;

create unique index if not exists project_members_project_user_uidx
  on public.project_members(project_id, user_id);
create index if not exists project_members_user_idx
  on public.project_members(user_id);
create index if not exists project_members_project_idx
  on public.project_members(project_id);

-- Todo proyecto existente conserva a su owner_id como propietario inamovible.
insert into public.project_members(project_id, user_id, role)
select id, owner_id, 'owner'
from public.projects
where owner_id is not null
on conflict (project_id, user_id) do update set role = 'owner';

alter table public.project_members
  add constraint project_members_role_check
  check (role in ('owner', 'admin', 'editor', 'viewer'));
alter table public.project_members
  alter column role set not null;

-- Helpers SECURITY DEFINER evitan recursión de RLS en project_members.
create or replace function public.project_access_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select case
    when p.owner_id = auth.uid() then 'owner'
    else coalesce((
      select lower(pm.role)
      from public.project_members pm
      where pm.project_id = p.id and pm.user_id = auth.uid()
      limit 1
    ), 'none')
  end
  from public.projects p
  where p.id = p_project_id;
$$;

create or replace function public.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select coalesce(public.project_access_role(p_project_id) in ('owner', 'admin', 'editor', 'viewer'), false);
$$;

create or replace function public.can_edit_project_content(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select coalesce(public.project_access_role(p_project_id) in ('owner', 'admin', 'editor'), false);
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select coalesce(public.project_access_role(p_project_id) in ('owner', 'admin'), false);
$$;

create or replace function public.project_id_for_area(p_area_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select a.project_id from public.areas a where a.id = p_area_id;
$$;

revoke all on function public.project_access_role(uuid) from public, anon;
revoke all on function public.can_view_project(uuid) from public, anon;
revoke all on function public.can_edit_project_content(uuid) from public, anon;
revoke all on function public.can_manage_project(uuid) from public, anon;
revoke all on function public.project_id_for_area(uuid) from public, anon;
grant execute on function public.project_access_role(uuid) to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;
grant execute on function public.can_edit_project_content(uuid) to authenticated;
grant execute on function public.can_manage_project(uuid) to authenticated;
grant execute on function public.project_id_for_area(uuid) to authenticated;

-- Impide transferir owner_id por una petición directa al API.
create or replace function public.protect_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'El propietario original del proyecto no puede modificarse';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_project_owner_trigger on public.projects;
create trigger protect_project_owner_trigger
before update of owner_id on public.projects
for each row execute function public.protect_project_owner();

create or replace function public.sync_project_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
begin
  insert into public.project_members(project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists sync_project_owner_membership_trigger on public.projects;
create trigger sync_project_owner_membership_trigger
after insert on public.projects
for each row execute function public.sync_project_owner_membership();

-- Creación atómica y segura de proyectos. El frontend no decide el owner_id:
-- siempre se toma de auth.uid(), y la membresía owner se guarda en la misma transacción.
create or replace function public.create_project_with_owner(
  p_name text,
  p_code text default null,
  p_company text default null
)
returns public.projects
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un proyecto';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre del proyecto es obligatorio';
  end if;

  insert into public.projects(owner_id, code, name, company)
  values (
    v_user_id,
    coalesce(nullif(trim(p_code), ''), 'PRY-' || right((extract(epoch from clock_timestamp()) * 1000)::bigint::text, 6)),
    trim(p_name),
    nullif(trim(p_company), '')
  )
  returning * into v_project;

  insert into public.project_members(project_id, user_id, role)
  values (v_project.id, v_user_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';

  return v_project;
end;
$$;

revoke all on function public.create_project_with_owner(text, text, text) from public, anon;
grant execute on function public.create_project_with_owner(text, text, text) to authenticated;

-- API segura para la interfaz: no expone auth.users de forma general.
create or replace function public.get_project_members(p_project_id uuid)
returns table(user_id uuid, email text, role text, is_owner boolean)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'No tienes permiso para administrar accesos de este proyecto';
  end if;

  return query
  select pm.user_id,
         coalesce(u.email::text, 'usuario-sin-correo') as email,
         case when p.owner_id = pm.user_id then 'owner' else lower(pm.role) end as role,
         (p.owner_id = pm.user_id) as is_owner
  from public.project_members pm
  join public.projects p on p.id = pm.project_id
  left join auth.users u on u.id = pm.user_id
  where pm.project_id = p_project_id
  order by (p.owner_id = pm.user_id) desc, lower(coalesce(u.email::text, ''));
end;
$$;

create or replace function public.manage_project_member(
  p_project_id uuid,
  p_email text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
set row_security = off
as $$
declare
  v_user_id uuid;
  v_role text := lower(trim(p_role));
  v_owner_id uuid;
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'No tienes permiso para administrar accesos de este proyecto';
  end if;

  if v_role not in ('admin', 'editor', 'viewer') then
    raise exception 'Rol inválido. Usa admin, editor o viewer';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email::text) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No existe una cuenta registrada con ese correo';
  end if;

  select owner_id into v_owner_id from public.projects where id = p_project_id;
  if v_user_id = v_owner_id then
    raise exception 'El propietario conserva su rol y no puede modificarse';
  end if;

  insert into public.project_members(project_id, user_id, role)
  values (p_project_id, v_user_id, v_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
end;
$$;

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_owner_id uuid;
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'No tienes permiso para administrar accesos de este proyecto';
  end if;

  select owner_id into v_owner_id from public.projects where id = p_project_id;
  if p_user_id = v_owner_id then
    raise exception 'No se puede quitar al propietario del proyecto';
  end if;

  delete from public.project_members
  where project_id = p_project_id and user_id = p_user_id;
end;
$$;

revoke all on function public.get_project_members(uuid) from public, anon;
revoke all on function public.manage_project_member(uuid, text, text) from public, anon;
revoke all on function public.remove_project_member(uuid, uuid) from public, anon;
grant execute on function public.get_project_members(uuid) to authenticated;
grant execute on function public.manage_project_member(uuid, text, text) to authenticated;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;

-- Reemplaza las políticas anteriores por una matriz coherente de roles.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('projects', 'areas', 'checklist_items', 'project_members')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

alter table public.projects enable row level security;
alter table public.areas enable row level security;
alter table public.checklist_items enable row level security;
alter table public.project_members enable row level security;

create policy projects_select on public.projects
for select to authenticated
using (public.can_view_project(id));

create policy projects_insert on public.projects
for insert to authenticated
with check (owner_id = auth.uid());

create policy projects_update on public.projects
for update to authenticated
using (public.can_manage_project(id))
with check (public.can_manage_project(id));

create policy projects_delete on public.projects
for delete to authenticated
using (public.can_manage_project(id));

create policy project_members_select on public.project_members
for select to authenticated
using (user_id = auth.uid() or public.can_manage_project(project_id));

create policy project_members_insert on public.project_members
for insert to authenticated
with check (
  public.can_manage_project(project_id)
  and role in ('admin', 'editor', 'viewer')
  and user_id <> (select owner_id from public.projects where id = project_id)
);

create policy project_members_update on public.project_members
for update to authenticated
using (
  public.can_manage_project(project_id)
  and user_id <> (select owner_id from public.projects where id = project_id)
)
with check (
  public.can_manage_project(project_id)
  and role in ('admin', 'editor', 'viewer')
  and user_id <> (select owner_id from public.projects where id = project_id)
);

create policy project_members_delete on public.project_members
for delete to authenticated
using (
  public.can_manage_project(project_id)
  and user_id <> (select owner_id from public.projects where id = project_id)
);

create policy areas_select on public.areas
for select to authenticated
using (public.can_view_project(project_id));

create policy areas_insert on public.areas
for insert to authenticated
with check (public.can_edit_project_content(project_id));

create policy areas_update on public.areas
for update to authenticated
using (public.can_edit_project_content(project_id))
with check (public.can_edit_project_content(project_id));

create policy areas_delete on public.areas
for delete to authenticated
using (public.can_edit_project_content(project_id));

create policy checklist_items_select on public.checklist_items
for select to authenticated
using (public.can_view_project(public.project_id_for_area(area_id)));

create policy checklist_items_insert on public.checklist_items
for insert to authenticated
with check (public.can_edit_project_content(public.project_id_for_area(area_id)));

create policy checklist_items_update on public.checklist_items
for update to authenticated
using (public.can_edit_project_content(public.project_id_for_area(area_id)))
with check (public.can_edit_project_content(public.project_id_for_area(area_id)));

create policy checklist_items_delete on public.checklist_items
for delete to authenticated
using (public.can_edit_project_content(public.project_id_for_area(area_id)));

-- Aplica la misma matriz a tablas Gantt existentes que tengan una columna project_id.
-- No crea ni modifica su estructura ni sus datos.
do $$
declare
  v_table_name text;
  policy_record record;
begin
  for v_table_name in
    select distinct c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'project_id'
      and c.table_name ilike '%gantt%'
      and t.table_type = 'BASE TABLE'
  loop
    if to_regclass(format('public.%I', v_table_name)) is not null then
      for policy_record in
        select policyname from pg_policies
        where schemaname = 'public' and pg_policies.tablename = v_table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, v_table_name);
      end loop;

      execute format('alter table public.%I enable row level security', v_table_name);
      execute format('create policy %I on public.%I for select to authenticated using (public.can_view_project(project_id))', v_table_name || '_select', v_table_name);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_project_content(project_id))', v_table_name || '_insert', v_table_name);
      execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_project_content(project_id)) with check (public.can_edit_project_content(project_id))', v_table_name || '_update', v_table_name);
      execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit_project_content(project_id))', v_table_name || '_delete', v_table_name);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
