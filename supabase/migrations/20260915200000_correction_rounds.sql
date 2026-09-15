begin;
alter table public.nc_projects add column included_correction_rounds integer check(included_correction_rounds between 0 and 999);
alter table public.nc_time_entries add column correction_round integer check(correction_round between 1 and 999);
comment on column public.nc_projects.included_correction_rounds is 'NULL = not agreed; 0 = no included correction rounds. Round numbers 1..limit are included.';
comment on column public.nc_time_entries.correction_round is 'NULL = regular work. Multiple entries with the same project/round count as one round. No automatic billing.';
-- Preserve compatibility with clients that omit the new optional argument.
drop function public.nc_timer(uuid,uuid,text,text,text,text);
drop function public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz);
create function public.nc_timer(p_user uuid,p_project uuid,p_kind text,p_action text,p_category text default 'active',p_description text default '',p_correction_round integer default null) returns uuid language plpgsql security invoker set search_path=public as $$
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
 insert into nc_time_entries(user_id,project_id,kind,category,description,correction_round) values(p_user,p_project,p_kind,p_category,p_description,p_correction_round) returning id into result;
elsif p_action='stop' then
 update nc_time_entries set stopped_at=now() where user_id=p_user and kind=p_kind and stopped_at is null returning id into result;
else raise exception 'Ungültige Aktion'; end if;
insert into nc_audit(user_id,action,entity_id) values(p_user,'timer.'||p_action,result);
return result;
end $$;

create function public.nc_manual_time(p_user uuid,p_project uuid,p_kind text,p_category text,p_description text,p_start timestamptz,p_stop timestamptz,p_correction_round integer default null) returns uuid language plpgsql security invoker set search_path=public as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if p_start is null or p_stop is null or p_stop<=p_start or p_stop>now() or p_stop-p_start>interval '24 hours' then raise exception 'Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.'; end if;
 if p_kind not in ('internal','external') or p_category not in ('active','processing','waiting','break') or length(trim(p_description))<3 then raise exception 'Zeitart oder Leistungsbeschreibung fehlt.'; end if;
 if not exists(select 1 from nc_projects where id=p_project and status<>'Archiviert') then raise exception 'Projekt nicht verfügbar.'; end if;
 if exists(select 1 from nc_time_entries where user_id=p_user and kind=p_kind and started_at<p_stop and coalesce(stopped_at,'infinity'::timestamptz)>p_start) then raise exception 'Der Zeitraum überschneidet sich mit einer bereits erfassten Zeit derselben Zeitart.'; end if;
 insert into nc_time_entries(user_id,project_id,kind,category,description,started_at,stopped_at,correction_round) values(p_user,p_project,p_kind,p_category,trim(p_description),p_start,p_stop,p_correction_round) returning id into result;
 insert into nc_audit(user_id,action,entity_id) values(p_user,'time.manual',result);
 return result;
end $$;
create or replace function public.nc_approve_time(p_user uuid,p_entry uuid) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries; p nc_projects;
begin
select * into t from nc_time_entries where id=p_entry for update;
if t.id is null or t.kind<>'external' or t.stopped_at is null or t.category='break' then raise exception 'Nur abgeschlossene externe Leistungen freigeben.'; end if;
if t.correction_round is not null then raise exception 'Die Abrechnung von Korrekturrunden wird separat vereinbart. Die Zeit bleibt zur Prüfung vorgemerkt.'; end if;
select * into p from nc_projects where id=t.project_id;
if t.category in ('waiting','processing') and not p.waiting_billable then raise exception 'Warte-/Verarbeitungszeit ist im Projekt nicht als abrechenbar vereinbart.'; end if;
if length(trim(t.description))<3 then raise exception 'Leistungsbeschreibung fehlt.'; end if;
update nc_time_entries set approved_at=now(),approved_by=p_user where id=p_entry;
insert into nc_audit(user_id,action,entity_id) values(p_user,'time.approve',p_entry);
end $$;


create function public.nc_correction_settings(p_user uuid,p_project uuid,p_included integer) returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 update nc_projects set included_correction_rounds=p_included where id=p_project;
 if not found then raise exception 'Projekt nicht gefunden.'; end if;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'project.correction_settings',p_project,jsonb_build_object('included_correction_rounds',p_included));
end $$;
create function public.nc_assign_correction(p_user uuid,p_entry uuid,p_round integer) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries;
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 select * into t from nc_time_entries where id=p_entry for update;
 if t.id is null then raise exception 'Zeit nicht gefunden.'; end if;
 if t.stopped_at is null or t.approved_at is not null or exists(select 1 from nc_invoice_times where time_id=p_entry) then raise exception 'Nur abgeschlossene, noch nicht freigegebene oder abgerechnete Zeiten können zugeordnet werden.'; end if;
 update nc_time_entries set correction_round=p_round where id=p_entry;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'time.correction',p_entry,jsonb_build_object('previous_round',t.correction_round,'correction_round',p_round));
end $$;
revoke all on function public.nc_timer(uuid,uuid,text,text,text,text,integer),public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer),public.nc_correction_settings(uuid,uuid,integer),public.nc_assign_correction(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.nc_timer(uuid,uuid,text,text,text,text,integer),public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer),public.nc_correction_settings(uuid,uuid,integer),public.nc_assign_correction(uuid,uuid,integer) to service_role;
notify pgrst, 'reload schema';
commit;
