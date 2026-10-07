-- Secretarial staff may consult published report cards/results without editing them.
drop policy if exists "report cards school read" on public.report_cards;
create policy "report cards school read" on public.report_cards for select to authenticated
using(school_id=my_school_id() and (status='published' or my_role()=any(array['promoteur','directeur','etudes','secretaire'])));

drop policy if exists "report card results school read" on public.report_card_results;
create policy "report card results school read" on public.report_card_results for select to authenticated
using(exists(select 1 from public.report_cards r where r.id=report_card_id and r.school_id=my_school_id() and (r.status='published' or my_role()=any(array['promoteur','directeur','etudes','secretaire']))));
