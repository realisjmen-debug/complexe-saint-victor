-- Role-specific finance visibility and school portal routing/security.
drop policy if exists "expenses finance read" on public.expenses;
create policy "expenses finance read" on public.expenses for select to authenticated
using (school_id=my_school_id() and my_role()=any(array['promoteur','finance','comptable']));

drop policy if exists "payments finance read" on public.payments;
create policy "payments finance read" on public.payments for select to authenticated
using (
  school_id=my_school_id()
  and (
    my_role()=any(array['promoteur','finance','comptable'])
    or (my_role()='directeur' and student_id is not null)
  )
);
