create table if not exists public.report_cards (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 academic_year_id uuid references public.academic_years(id) on delete set null,
 term text not null,
 status text not null default 'draft' check (status in ('draft','validated','published','archived')),
 average numeric(6,2), rank integer, appreciation text,
 validated_by uuid references auth.users(id), validated_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(student_id, academic_year_id, term)
);
create table if not exists public.report_card_results (
 id uuid primary key default gen_random_uuid(),
 report_card_id uuid not null references public.report_cards(id) on delete cascade,
 subject_id uuid not null references public.subjects(id) on delete restrict,
 coefficient numeric(6,2) not null default 1, average numeric(6,2), rank integer, teacher_comment text,
 unique(report_card_id, subject_id)
);
create table if not exists public.schedules (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 academic_year_id uuid references public.academic_years(id) on delete set null,
 class_id uuid not null references public.classes(id) on delete cascade,
 subject_id uuid references public.subjects(id) on delete set null,
 teacher_id uuid references public.teachers(id) on delete set null,
 weekday smallint not null check (weekday between 1 and 6),
 start_time time not null, end_time time not null, room text,
 created_at timestamptz not null default now(), check (end_time > start_time)
);
create table if not exists public.payment_methods (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 name text not null, code text not null, active boolean not null default true,
 unique(school_id, code)
);
create table if not exists public.cash_movements (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 movement_type text not null check (movement_type in ('in','out','adjustment')),
 amount numeric(14,2) not null check (amount > 0),
 payment_id uuid references public.payments(id) on delete set null,
 expense_id uuid references public.expenses(id) on delete set null,
 method text, reference text, note text,
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table public.report_cards enable row level security;
alter table public.report_card_results enable row level security;
alter table public.schedules enable row level security;
alter table public.payment_methods enable row level security;
alter table public.cash_movements enable row level security;
create policy "report cards school read" on public.report_cards for select to authenticated using (school_id=public.my_school_id());
create policy "report cards manage" on public.report_cards for all to authenticated using (my_role()=any(array['promoteur','directeur','administrateur','etudes']) and school_id=my_school_id()) with check (school_id=my_school_id());
create policy "report card results school read" on public.report_card_results for select to authenticated using (exists(select 1 from public.report_cards r where r.id=report_card_id and r.school_id=my_school_id()));
create policy "report card results manage" on public.report_card_results for all to authenticated using (my_role()=any(array['promoteur','directeur','administrateur','etudes','enseignant']) and exists(select 1 from public.report_cards r where r.id=report_card_id and r.school_id=my_school_id())) with check (exists(select 1 from public.report_cards r where r.id=report_card_id and r.school_id=my_school_id()));
create policy "schedules school read" on public.schedules for select to authenticated using (school_id=my_school_id());
create policy "schedules manage" on public.schedules for all to authenticated using (my_role()=any(array['promoteur','directeur','administrateur','etudes']) and school_id=my_school_id()) with check (school_id=my_school_id());
create policy "payment methods school read" on public.payment_methods for select to authenticated using (school_id=my_school_id());
create policy "payment methods manage" on public.payment_methods for all to authenticated using (my_role()=any(array['promoteur','directeur','administrateur','finance','comptable']) and school_id=my_school_id()) with check (school_id=my_school_id());
create policy "cash movements school read" on public.cash_movements for select to authenticated using (school_id=my_school_id());
create policy "cash movements manage" on public.cash_movements for all to authenticated using (my_role()=any(array['promoteur','directeur','administrateur','finance','comptable']) and school_id=my_school_id()) with check (school_id=my_school_id());
grant all on table public.report_cards,public.report_card_results,public.schedules,public.payment_methods,public.cash_movements to service_role;
grant select,insert,update,delete on table public.report_cards,public.report_card_results,public.schedules,public.payment_methods,public.cash_movements to authenticated;
