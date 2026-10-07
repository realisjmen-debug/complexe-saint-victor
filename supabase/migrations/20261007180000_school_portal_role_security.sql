-- School portal, role security, storage and branding changes
alter table public.schools add column if not exists logo_path text;
alter table public.students add column if not exists photo_path text;
alter table public.teachers add column if not exists access_code text;
create unique index if not exists uq_teachers_school_access_code on public.teachers(school_id,access_code) where access_code is not null;
insert into storage.buckets(id,name,public) values('school-assets','school-assets',false) on conflict(id) do update set public=false;

drop policy if exists "school assets select" on storage.objects;
drop policy if exists "school assets insert" on storage.objects;
drop policy if exists "school assets update" on storage.objects;
drop policy if exists "school assets delete" on storage.objects;
create policy "school assets select" on storage.objects for select to authenticated using(bucket_id='school-assets' and split_part(name,'/',1)=my_school_id()::text);
create policy "school assets insert" on storage.objects for insert to authenticated with check(bucket_id='school-assets' and split_part(name,'/',1)=my_school_id()::text and (my_role()='promoteur' or (my_role()='secretaire' and split_part(name,'/',2)='students')));
create policy "school assets update" on storage.objects for update to authenticated using(bucket_id='school-assets' and split_part(name,'/',1)=my_school_id()::text and my_role()='promoteur') with check(bucket_id='school-assets' and split_part(name,'/',1)=my_school_id()::text and my_role()='promoteur');
create policy "school assets delete" on storage.objects for delete to authenticated using(bucket_id='school-assets' and split_part(name,'/',1)=my_school_id()::text and my_role()='promoteur');

drop policy if exists "attendance operational manage" on public.attendance;
create policy "attendance operational manage" on public.attendance for all to authenticated using(school_id=my_school_id() and my_role()='discipline') with check(school_id=my_school_id() and my_role()='discipline');

drop policy if exists "announcements manage" on public.announcements;
create policy "announcements manage" on public.announcements for all to authenticated using(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','etudes'])) with check(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','etudes']));
drop policy if exists "announcements read" on public.announcements;
create policy "announcements read" on public.announcements for select to authenticated using(school_id=my_school_id() and (published=true or my_role()=any(array['promoteur','directeur','etudes'])));

drop policy if exists "school admin" on public.schools;
create policy "school branding promoteur" on public.schools for update to authenticated using(my_role()='promoteur' and id=my_school_id()) with check(my_role()='promoteur' and id=my_school_id());

drop policy if exists "expenses read" on public.expenses;
drop policy if exists "expenses finance read" on public.expenses;
create policy "expenses finance read" on public.expenses for select to authenticated using(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','finance','comptable']));
drop policy if exists "payments read" on public.payments;
drop policy if exists "payments finance read" on public.payments;
create policy "payments finance read" on public.payments for select to authenticated using(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','finance','comptable']));
drop policy if exists "fees read" on public.fees;
create policy "fees read" on public.fees for select to authenticated using(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','finance','comptable']));
drop policy if exists "student fees read" on public.student_fees;
create policy "student fees read" on public.student_fees for select to authenticated using(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','finance','comptable']));
drop policy if exists "payment items school access" on public.payment_items;
create policy "payment items school access" on public.payment_items for select to authenticated using(school_id=my_school_id() and my_role()=any(array['promoteur','directeur','finance','comptable']));

drop policy if exists "assessments read" on public.assessments;
create policy "assessments read" on public.assessments for select to authenticated using(school_id=my_school_id() and (my_role()=any(array['promoteur','directeur','etudes']) or (my_role()='enseignant' and exists(select 1 from public.teacher_subject_assignments tsa join public.teachers t on t.id=tsa.teacher_id where tsa.school_id=assessments.school_id and tsa.active and tsa.class_id=assessments.class_id and tsa.subject_id=assessments.subject_id and t.active and t.email=(select email::text from auth.users where id=auth.uid())))));
drop policy if exists "grades read" on public.grades;
create policy "grades read" on public.grades for select to authenticated using(exists(select 1 from public.assessments a where a.id=grades.assessment_id and a.school_id=my_school_id()) and (my_role()=any(array['promoteur','directeur','etudes']) or (my_role()='enseignant' and exists(select 1 from public.assessments a join public.teacher_subject_assignments tsa on tsa.class_id=a.class_id and tsa.subject_id=a.subject_id and tsa.school_id=a.school_id join public.teachers t on t.id=tsa.teacher_id where a.id=grades.assessment_id and tsa.active and t.active and t.email=(select email::text from auth.users where id=auth.uid())))));
drop policy if exists "report cards school read" on public.report_cards;
create policy "report cards school read" on public.report_cards for select to authenticated using(school_id=my_school_id() and (status='published' or my_role()=any(array['promoteur','directeur','etudes'])));
drop policy if exists "report card results school read" on public.report_card_results;
create policy "report card results school read" on public.report_card_results for select to authenticated using(exists(select 1 from public.report_cards r where r.id=report_card_id and r.school_id=my_school_id() and (r.status='published' or my_role()=any(array['promoteur','directeur','etudes']))));