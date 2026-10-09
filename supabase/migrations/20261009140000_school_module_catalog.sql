-- MONATSHIEBE multi-school module catalog and per-school activation.
create table if not exists public.module_catalog (
  module_key text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'Administration',
  implementation_status text not null default 'planned'
    check (implementation_status in ('available','in_development','planned')),
  default_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_modules (
  school_id uuid not null references public.schools(id) on delete cascade,
  module_key text not null references public.module_catalog(module_key) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  primary key (school_id, module_key)
);

alter table public.module_catalog enable row level security;
alter table public.school_modules enable row level security;

drop policy if exists "Authenticated users read module catalog" on public.module_catalog;
create policy "Authenticated users read module catalog"
  on public.module_catalog for select to authenticated using (true);
drop policy if exists "Platform admins manage module catalog" on public.module_catalog;
create policy "Platform admins manage module catalog"
  on public.module_catalog for all to authenticated
  using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()) and pa.active=true))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()) and pa.active=true));

drop policy if exists "Schools and platform admins read module activation" on public.school_modules;
create policy "Schools and platform admins read module activation"
  on public.school_modules for select to authenticated
  using (school_id = public.my_school_id() or exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()) and pa.active=true));
drop policy if exists "Platform admins manage module activation" on public.school_modules;
create policy "Platform admins manage module activation"
  on public.school_modules for all to authenticated
  using (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()) and pa.active=true))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()) and pa.active=true));

insert into public.module_catalog(module_key,name,description,category,implementation_status,default_enabled) values
('dashboard','Tableau de bord','Indicateurs et résumé de l’établissement','Administration','available',true),
('students','Gestion des élèves','Dossiers, matricules, photos et cartes','Scolarité','available',true),
('parents','Gestion des parents','Comptes parents et liens avec les enfants','Scolarité','available',true),
('enrollments','Inscriptions et réinscriptions','Dossiers et opérations d’inscription','Scolarité','available',true),
('studies','Gestion pédagogique','Cycles, classes, matières et organisation des études','Pédagogie','available',true),
('assignments','Affectations des enseignants','Affectations aux classes et matières','Pédagogie','available',true),
('attendance','Présences et absences','Suivi des présences, retards et absences','Vie scolaire','available',true),
('discipline','Discipline','Incidents et dossiers disciplinaires','Vie scolaire','available',true),
('schedule','Emploi du temps','Organisation des horaires et cours','Pédagogie','available',true),
('grades','Notes et évaluations','Évaluations, notes et moyennes','Pédagogie','available',true),
('reportcards','Bulletins et relevés','Préparation et publication des résultats','Pédagogie','available',true),
('finance','Finances et comptabilité','Recettes, dépenses, caisse et rapports','Finance','available',true),
('studentFinance','Situation financière des élèves','Frais, soldes et échéances','Finance','available',true),
('staff','Personnel et autorisations','Dossiers du personnel, rôles et accès','Ressources humaines','available',true),
('announcements','Communications','Annonces et communications scolaires','Communication','available',true),
('settings','Paramètres de l’établissement','Identité, logo et paramètres locaux','Administration','available',true),
('audit','Journal d’activité','Historique des opérations sensibles','Administration','available',true),
('library','Bibliothèque et emprunts','Catalogue, prêts, retours et retards','Services scolaires','planned',false),
('transport','Transport scolaire','Véhicules, circuits, chauffeurs et élèves','Services scolaires','planned',false),
('inventory','Stocks et matériel','Inventaire, mouvements, achats et alertes','Logistique','planned',false),
('staff_attendance_leave','Présences et congés du personnel','Présences, absences et demandes de congé','Ressources humaines','planned',false),
('student_portal','Portail autonome des élèves','Accès personnel aux résultats et horaires','Portails','planned',false),
('excel_io','Importation et exportation Excel','Import/export avec validation et détection des doublons','Outils','planned',false),
('canteen','Cantine scolaire','Menus, repas, abonnements et stocks alimentaires','Services scolaires','planned',false),
('boarding','Internat et dortoirs','Chambres, lits, affectations et présences','Services scolaires','planned',false),
('payroll','Salaires et paiements du personnel','Rémunérations, avances, retenues et fiches de paie','Ressources humaines','planned',false),
('online_payments','Paiements électroniques','Transactions et reçus après confirmation du prestataire','Finance','planned',false),
('sms_notifications','SMS automatiques','Rappels et notifications aux parents','Communication','planned',false),
('extracurricular','Activités parascolaires','Activités, événements et inscriptions','Vie scolaire','planned',false)
on conflict (module_key) do update set
  name=excluded.name, description=excluded.description, category=excluded.category,
  implementation_status=excluded.implementation_status, default_enabled=excluded.default_enabled,
  updated_at=now();

insert into public.school_modules(school_id,module_key,enabled)
select s.id,m.module_key,m.default_enabled from public.schools s cross join public.module_catalog m
on conflict (school_id,module_key) do nothing;

create or replace function public.initialize_school_modules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.school_modules(school_id,module_key,enabled)
  select new.id,m.module_key,m.default_enabled from public.module_catalog m
  on conflict (school_id,module_key) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_initialize_school_modules on public.schools;
create trigger trg_initialize_school_modules after insert on public.schools
for each row execute function public.initialize_school_modules();
revoke all on function public.initialize_school_modules() from public, anon, authenticated;

grant select, insert, update, delete on public.module_catalog to authenticated;
grant select, insert, update, delete on public.school_modules to authenticated;
