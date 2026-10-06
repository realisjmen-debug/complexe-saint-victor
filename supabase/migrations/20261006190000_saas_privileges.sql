-- Saint Victor SaaS: privileges required by server-side Edge Functions
-- Safe to re-run. RLS remains the primary tenant isolation layer for client roles.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('grant all on table public.%I to service_role', r.tablename);
  end loop;
end $$;

grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant select on public.platform_admins to authenticated;
grant select on public.subscription_plans to authenticated;
grant update on public.schools to authenticated;

-- Server-only profile bootstrap function.
revoke all on function public.create_school_profile(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_school_profile(uuid,uuid,uuid,text,text) to service_role;
