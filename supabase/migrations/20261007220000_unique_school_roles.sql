-- Enforce one active holder for each unique school role.
create or replace function public.enforce_unique_school_role()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  role_name text;
begin
  select name into role_name from public.roles where id=new.role_id;
  if new.active and role_name in ('administrateur','directeur','secretaire','finance','comptable','etudes','discipline','surveillant') then
    if exists (
      select 1
      from public.profiles p
      where p.school_id=new.school_id
        and p.role_id=new.role_id
        and p.active=true
        and p.id<>new.id
    ) then
      raise exception 'Ce rôle est déjà attribué à une personne active dans cette école.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_unique_school_role on public.profiles;
create trigger trg_unique_school_role
before insert or update of school_id,role_id,active on public.profiles
for each row execute function public.enforce_unique_school_role();

grant execute on function public.enforce_unique_school_role() to authenticated;
