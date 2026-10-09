-- Stocks et matériel scolaire : tables isolées par établissement.
-- La migration school_inventory_and_equipment crée les tables et politiques RLS.
insert into public.roles(name,label,description) values ('logisticien','Logisticien','Gestion des stocks et du matériel scolaire') on conflict (name) do update set label=excluded.label, description=excluded.description;
update public.module_catalog set implementation_status='available', description='Gestion des articles, équipements, entrées, sorties, seuils d’alerte et historique des mouvements.' where module_key='inventory';
