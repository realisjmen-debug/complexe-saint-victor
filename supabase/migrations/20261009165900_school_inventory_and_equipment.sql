create table if not exists public.inventory_items (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 name text not null, category text not null default 'Général',
 item_type text not null default 'consumable' check (item_type in ('consumable','equipment')),
 sku text, unit text not null default 'pièce', quantity numeric(12,2) not null default 0 check (quantity >= 0),
 min_quantity numeric(12,2) not null default 0 check (min_quantity >= 0), unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
 storage_location text, condition_status text not null default 'good' check (condition_status in ('good','worn','damaged','out_of_service')),
 notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(school_id, sku)
);
create table if not exists public.inventory_movements (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 item_id uuid not null references public.inventory_items(id) on delete restrict,
 movement_type text not null check (movement_type in ('in','out','adjustment')),
 quantity numeric(12,2) not null check (quantity > 0), reason text not null, reference text, recipient text,
 performed_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists inventory_items_school_name_idx on public.inventory_items(school_id,name);
create index if not exists inventory_movements_school_created_idx on public.inventory_movements(school_id,created_at desc);
create index if not exists inventory_movements_item_idx on public.inventory_movements(item_id,created_at desc);
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
drop policy if exists inventory_items_select_school on public.inventory_items;
create policy inventory_items_select_school on public.inventory_items for select to authenticated using (school_id = public.my_school_id());
drop policy if exists inventory_items_insert_authorized on public.inventory_items;
create policy inventory_items_insert_authorized on public.inventory_items for insert to authenticated with check (school_id = public.my_school_id() and exists (select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and r.name in ('promoteur','administrateur','logisticien')));
drop policy if exists inventory_items_update_authorized on public.inventory_items;
create policy inventory_items_update_authorized on public.inventory_items for update to authenticated using (school_id=public.my_school_id() and exists (select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and r.name in ('promoteur','administrateur','logisticien'))) with check (school_id=public.my_school_id() and exists (select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and r.name in ('promoteur','administrateur','logisticien')));
drop policy if exists inventory_items_delete_authorized on public.inventory_items;
create policy inventory_items_delete_authorized on public.inventory_items for delete to authenticated using (school_id=public.my_school_id() and exists (select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and r.name in ('promoteur','administrateur','logisticien')));
drop policy if exists inventory_movements_select_school on public.inventory_movements;
create policy inventory_movements_select_school on public.inventory_movements for select to authenticated using (school_id=public.my_school_id());
drop policy if exists inventory_movements_insert_authorized on public.inventory_movements;
create policy inventory_movements_insert_authorized on public.inventory_movements for insert to authenticated with check (school_id=public.my_school_id() and exists (select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and r.name in ('promoteur','administrateur','logisticien')) and exists (select 1 from public.inventory_items i where i.id=item_id and i.school_id=public.my_school_id()));
grant select,insert,update,delete on public.inventory_items to authenticated;
grant select,insert on public.inventory_movements to authenticated;
