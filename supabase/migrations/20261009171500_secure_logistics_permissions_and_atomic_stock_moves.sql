drop policy if exists inventory_items_insert_authorized on public.inventory_items;
create policy inventory_items_insert_authorized on public.inventory_items for insert to authenticated with check (school_id=public.my_school_id() and exists(select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and (r.name in ('promoteur','administrateur','logisticien') or coalesce((p.permission_overrides->>'inventory')::boolean,false) or coalesce((p.permission_overrides->>'inventory_logistics')::boolean,false))));
drop policy if exists inventory_items_update_authorized on public.inventory_items;
create policy inventory_items_update_authorized on public.inventory_items for update to authenticated using (school_id=public.my_school_id() and exists(select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and (r.name in ('promoteur','administrateur','logisticien') or coalesce((p.permission_overrides->>'inventory')::boolean,false) or coalesce((p.permission_overrides->>'inventory_logistics')::boolean,false)))) with check (school_id=public.my_school_id() and exists(select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and (r.name in ('promoteur','administrateur','logisticien') or coalesce((p.permission_overrides->>'inventory')::boolean,false) or coalesce((p.permission_overrides->>'inventory_logistics')::boolean,false))));
drop policy if exists inventory_items_delete_authorized on public.inventory_items;
create policy inventory_items_delete_authorized on public.inventory_items for delete to authenticated using (school_id=public.my_school_id() and exists(select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=auth.uid() and p.school_id=public.my_school_id() and p.active=true and (r.name in ('promoteur','administrateur','logisticien') or coalesce((p.permission_overrides->>'inventory')::boolean,false) or coalesce((p.permission_overrides->>'inventory_logistics')::boolean,false))));
create or replace function public.record_inventory_movement(p_item_id uuid,p_movement_type text,p_quantity numeric,p_reason text,p_reference text default null,p_recipient text default null) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $fn$
declare v_school uuid; v_qty numeric; v_new numeric; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 if p_movement_type not in ('in','out','adjustment') then raise exception 'Type de mouvement invalide'; end if;
 if p_quantity is null or p_quantity<=0 then raise exception 'La quantité doit être positive'; end if;
 if not public.inventory_logistics_can_manage() then raise exception 'Permission logistique refusée'; end if;
 select school_id,quantity into v_school,v_qty from public.inventory_items where id=p_item_id and school_id=public.my_school_id() for update;
 if not found then raise exception 'Article introuvable dans cet établissement'; end if;
 if p_movement_type='in' then v_new:=v_qty+p_quantity; elsif p_movement_type='out' then v_new:=v_qty-p_quantity; else v_new:=p_quantity; end if;
 if v_new<0 then raise exception 'Stock insuffisant'; end if;
 insert into public.inventory_movements(school_id,item_id,movement_type,quantity,reason,reference,recipient,performed_by) values(v_school,p_item_id,p_movement_type,p_quantity,coalesce(nullif(trim(p_reason),''),'Mouvement de stock'),p_reference,p_recipient,auth.uid()) returning id into v_id;
 update public.inventory_items set quantity=v_new,updated_at=now() where id=p_item_id and school_id=v_school;
 return v_id;
end $fn$;
revoke all on function public.record_inventory_movement(uuid,text,numeric,text,text,text) from public,anon;
grant execute on function public.record_inventory_movement(uuid,text,numeric,text,text,text) to authenticated;