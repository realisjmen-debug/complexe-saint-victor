-- Parent access codes for the school portal.
alter table public.students
  add column if not exists parent_access_code text;

update public.students
set parent_access_code = 'P-' || upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 12))
where parent_access_code is null or parent_access_code = '';

alter table public.students
  alter column parent_access_code set default ('P-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)));

create unique index if not exists students_parent_access_code_uidx
  on public.students(parent_access_code);

create index if not exists students_school_parent_access_code_idx
  on public.students(school_id, parent_access_code);
