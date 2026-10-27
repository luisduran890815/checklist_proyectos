-- Campos para planeación y control del cronograma Gantt.
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.checklist_items
  add column if not exists supplier text,
  add column if not exists responsible text,
  add column if not exists planned_start date,
  add column if not exists planned_end date,
  add column if not exists progress smallint not null default 0;

update public.checklist_items
set progress = case when upper(status::text) = 'OK' then 100 else coalesce(progress, 0) end;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'checklist_items_progress_range') then
    alter table public.checklist_items
      add constraint checklist_items_progress_range check (progress between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'checklist_items_planned_dates_order') then
    alter table public.checklist_items
      add constraint checklist_items_planned_dates_order
      check (planned_start is null or planned_end is null or planned_end >= planned_start);
  end if;
end $$;

create index if not exists checklist_items_planned_dates_idx
  on public.checklist_items (planned_start, planned_end);
create index if not exists checklist_items_responsible_idx
  on public.checklist_items (responsible);

comment on column public.checklist_items.supplier is 'Proveedor o contratista asignado';
comment on column public.checklist_items.responsible is 'Responsable interno de la actividad';
comment on column public.checklist_items.planned_start is 'Fecha planeada de inicio';
comment on column public.checklist_items.planned_end is 'Fecha planeada de terminación';
comment on column public.checklist_items.progress is 'Avance porcentual entre 0 y 100';
