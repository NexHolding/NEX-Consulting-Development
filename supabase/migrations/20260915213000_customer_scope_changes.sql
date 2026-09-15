begin;
alter table public.nc_time_entries add column change_request text;
alter table public.nc_time_entries add constraint nc_change_request_documented check(change_request is null or (length(btrim(change_request)) between 3 and 2000));
alter table public.nc_time_entries add constraint nc_change_request_not_correction check(change_request is null or correction_round is null);
comment on column public.nc_time_entries.change_request is 'Customer-requested scope change, documented separately from correction rounds. NULL = no scope change. Separate billing pending agreement.';
drop function public.nc_timer(uuid,uuid,text,text,text,text,integer);
drop function public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer);
create function public.nc_timer(p_user uuid,p_project uuid,p_kind text,p_action text,p_category text default 'active',p_description text default '',p_correction_round integer default null,p_change_request text default null) returns uuid language plpgsql security invoker set search_path=public as $$
declare result uuid; other_project uuid;
begin
perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
if p_action='start' then
 if p_kind not in ('internal','external') then raise exception 'Ungültiger Timer'; end if;
 select project_id into other_project from nc_time_entries where user_id=p_user and stopped_at is null limit 1;
 if other_project is not null and other_project<>p_project then raise exception 'Zuerst laufende Timer des anderen Projekts stoppen.'; end if;
 if not exists(select 1 from nc_projects where id=p_project and status<>'Archiviert') then raise exception 'Projekt nicht verfügbar'; end if;
 select id into result from nc_time_entries where user_id=p_user and kind=p_kind and stopped_at is null;
 if result is not null then return result; end if;
 insert into nc_time_entries(user_id,project_id,kind,category,description,correction_round,change_request) values(p_user,p_project,p_kind,p_category,p_description,p_correction_round,p_change_request) returning id into result;
elsif p_action='stop' then
 update nc_time_entries set stopped_at=now() where user_id=p_user and kind=p_kind and stopped_at is null returning id into result;
else raise exception 'Ungültige Aktion'; end if;
insert into nc_audit(user_id,action,entity_id) values(p_user,'timer.'||p_action,result);
return result;
end $$;

create function public.nc_manual_time(p_user uuid,p_project uuid,p_kind text,p_category text,p_description text,p_start timestamptz,p_stop timestamptz,p_correction_round integer default null,p_change_request text default null) returns uuid language plpgsql security invoker set search_path=public as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if p_start is null or p_stop is null or p_stop<=p_start or p_stop>now() or p_stop-p_start>interval '24 hours' then raise exception 'Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.'; end if;
 if p_kind not in ('internal','external') or p_category not in ('active','processing','waiting','break') or length(trim(p_description))<3 then raise exception 'Zeitart oder Leistungsbeschreibung fehlt.'; end if;
 if not exists(select 1 from nc_projects where id=p_project and status<>'Archiviert') then raise exception 'Projekt nicht verfügbar.'; end if;
 if exists(select 1 from nc_time_entries where user_id=p_user and kind=p_kind and started_at<p_stop and coalesce(stopped_at,'infinity'::timestamptz)>p_start) then raise exception 'Der Zeitraum überschneidet sich mit einer bereits erfassten Zeit derselben Zeitart.'; end if;
 insert into nc_time_entries(user_id,project_id,kind,category,description,started_at,stopped_at,correction_round,change_request) values(p_user,p_project,p_kind,p_category,trim(p_description),p_start,p_stop,p_correction_round,p_change_request) returning id into result;
 insert into nc_audit(user_id,action,entity_id) values(p_user,'time.manual',result);
 return result;
end $$;
create or replace function public.nc_approve_time(p_user uuid,p_entry uuid) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries; p nc_projects;
begin
select * into t from nc_time_entries where id=p_entry for update;
if t.id is null or t.kind<>'external' or t.stopped_at is null or t.category='break' then raise exception 'Nur abgeschlossene externe Leistungen freigeben.'; end if;
if t.change_request is not null then raise exception 'Abänderungen sind separat abzurechnen. Die Abrechnungsformalitäten sind noch offen.'; end if;
if t.correction_round is not null then raise exception 'Die Abrechnung von Korrekturrunden wird separat vereinbart. Die Zeit bleibt zur Prüfung vorgemerkt.'; end if;
select * into p from nc_projects where id=t.project_id;
if t.category in ('waiting','processing') and not p.waiting_billable then raise exception 'Warte-/Verarbeitungszeit ist im Projekt nicht als abrechenbar vereinbart.'; end if;
if length(trim(t.description))<3 then raise exception 'Leistungsbeschreibung fehlt.'; end if;
update nc_time_entries set approved_at=now(),approved_by=p_user where id=p_entry;
insert into nc_audit(user_id,action,entity_id) values(p_user,'time.approve',p_entry);
end $$;



create function public.nc_assign_time_work(p_user uuid,p_entry uuid,p_round integer,p_change_request text default null) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries;
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 select * into t from nc_time_entries where id=p_entry for update;
 if t.id is null then raise exception 'Zeit nicht gefunden.'; end if;
 if t.stopped_at is null or t.approved_at is not null or exists(select 1 from nc_invoice_times where time_id=p_entry) then raise exception 'Nur abgeschlossene, noch nicht freigegebene oder abgerechnete Zeiten können zugeordnet werden.'; end if;
 update nc_time_entries set correction_round=p_round,change_request=p_change_request where id=p_entry;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'time.assignment',p_entry,jsonb_build_object('previous_round',t.correction_round,'correction_round',p_round,'previous_change_request',t.change_request,'change_request',p_change_request));
end $$;
-- Older clients cannot accidentally erase an existing scope-change document.
create or replace function public.nc_assign_correction(p_user uuid,p_entry uuid,p_round integer) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries;
begin
 select * into t from nc_time_entries where id=p_entry for update;
 if t.change_request is not null then raise exception 'Abänderung über die Leistungszuordnung bearbeiten.'; end if;
 perform public.nc_assign_time_work(p_user,p_entry,p_round,null);
end $$;
revoke all on function public.nc_timer(uuid,uuid,text,text,text,text,integer,text),public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text),public.nc_assign_time_work(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.nc_timer(uuid,uuid,text,text,text,text,integer,text),public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text),public.nc_assign_time_work(uuid,uuid,integer,text) to service_role;
notify pgrst, 'reload schema';
commit;
