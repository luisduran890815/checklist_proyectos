-- Bitácora de proyectos — esquema inicial para Supabase/PostgreSQL
-- Ejecutar en Supabase SQL Editor o mediante `supabase db push`.

create extension if not exists pgcrypto;

do $$ begin
  create type public.project_status as enum ('active', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.checklist_status as enum ('pending', 'ok');
exception when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  code text not null default '',
  description text not null default '',
  status public.project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '',
  sort_order integer not null default 1 check (sort_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  identified_on date not null default current_date,
  description text not null check (char_length(trim(description)) between 1 and 500),
  status public.checklist_status not null default 'pending',
  observations text not null default '',
  solped text not null default '',
  purchase_order text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists areas_project_id_idx on public.areas(project_id);
create index if not exists areas_user_id_idx on public.areas(user_id);
create index if not exists checklist_items_project_id_idx on public.checklist_items(project_id);
create index if not exists checklist_items_area_id_idx on public.checklist_items(area_id);
create index if not exists checklist_items_user_status_idx on public.checklist_items(user_id, status);
create index if not exists checklist_items_identified_on_idx on public.checklist_items(identified_on);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists areas_set_updated_at on public.areas;
create trigger areas_set_updated_at before update on public.areas
for each row execute function public.set_updated_at();

drop trigger if exists checklist_items_set_updated_at on public.checklist_items;
create trigger checklist_items_set_updated_at before update on public.checklist_items
for each row execute function public.set_updated_at();

-- Garantiza que el project_id de un ítem corresponda al proyecto de su área.
create or replace function public.validate_item_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  linked_project uuid;
  linked_user uuid;
begin
  select a.project_id, a.user_id into linked_project, linked_user
  from public.areas a where a.id = new.area_id;
  if linked_project is null then
    raise exception 'El área seleccionada no existe';
  end if;
  if new.project_id <> linked_project then
    raise exception 'El proyecto del ítem no coincide con el proyecto del área';
  end if;
  if new.user_id <> linked_user then
    raise exception 'El propietario del ítem no coincide con el propietario del área';
  end if;
  return new;
end;
$$;

drop trigger if exists checklist_items_validate_hierarchy on public.checklist_items;
create trigger checklist_items_validate_hierarchy
before insert or update of area_id, project_id, user_id on public.checklist_items
for each row execute function public.validate_item_hierarchy();

alter table public.projects enable row level security;
alter table public.areas enable row level security;
alter table public.checklist_items enable row level security;

-- Cada usuario solo puede operar sus propios proyectos.
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Un área debe pertenecer al usuario y a uno de sus proyectos.
drop policy if exists "areas_owner_all" on public.areas;
create policy "areas_owner_all" on public.areas
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.user_id = auth.uid()
  )
);

-- Un ítem debe pertenecer al usuario, a su proyecto y a un área de ese proyecto.
drop policy if exists "checklist_items_owner_all" on public.checklist_items;
create policy "checklist_items_owner_all" on public.checklist_items
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.areas a
    join public.projects p on p.id = a.project_id
    where a.id = area_id
      and a.project_id = checklist_items.project_id
      and a.user_id = auth.uid()
      and p.user_id = auth.uid()
  )
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.areas to authenticated;
grant select, insert, update, delete on public.checklist_items to authenticated;
