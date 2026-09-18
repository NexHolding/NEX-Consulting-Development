begin;
alter table public.nc_time_entries add column version integer not null default 0;
create function public.nc_time_revision() returns trigger language plpgsql set search_path=public as $$
begin new.version:=old.version+1; return new; end $$;
create trigger nc_time_revision before update on public.nc_time_entries for each row execute function public.nc_time_revision();

create function public.nc_edit_time(p_user uuid,p_entry uuid,p_version integer,p_project uuid,p_kind text,p_category text,p_description text,p_start timestamptz,p_stop timestamptz,p_reason text,p_correction_round integer default null,p_change_request text default null,p_change_round integer default null,p_extra_work text default null)
returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries; owner_id uuid; updated nc_time_entries;
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 select user_id into owner_id from nc_time_entries where id=p_entry;
 if owner_id is null then raise exception 'Zeiteintrag nicht gefunden.'; end if;
 -- Same lock order as start/stop and manual entries; serialize changes per time owner.
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
 select * into t from nc_time_entries where id=p_entry for update;
 if t.id is null then raise exception 'Zeiteintrag nicht gefunden.'; end if;
 if p_version is null or t.version<>p_version then raise exception 'Der Eintrag wurde inzwischen geändert. Bitte schließen, aktualisieren und erneut öffnen.'; end if;
 if exists(select 1 from nc_invoice_times where time_id=p_entry) then raise exception 'Dieser Eintrag ist bereits einer Rechnung zugeordnet und kann nicht verändert werden.'; end if;
 if p_start is null or p_stop is null or not isfinite(p_start) or not isfinite(p_stop) or p_stop<=p_start or p_stop>now() or p_stop-p_start>interval '24 hours' then raise exception 'Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.'; end if;
 if p_kind is null or p_kind not in ('internal','external') or p_category is null or p_category not in ('active','processing','waiting','break') then raise exception 'Ungültige Zeitart oder Kategorie.'; end if;
 if p_description is null or length(btrim(p_description)) not between 3 and 1000 or p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Bitte Leistung und Änderungsgrund vollständig angeben.'; end if;
 if not exists(select 1 from nc_projects where id=p_project and (status<>'Archiviert' or id=t.project_id)) then raise exception 'Projekt nicht verfügbar.'; end if;
 if exists(select 1 from nc_time_entries where id<>p_entry and user_id=owner_id and kind=p_kind and started_at<p_stop and coalesce(stopped_at,'infinity'::timestamptz)>p_start) then raise exception 'Der Zeitraum überschneidet sich mit einer bereits erfassten Zeit derselben Zeitart.'; end if;
 update nc_time_entries set project_id=p_project,kind=p_kind,category=p_category,description=btrim(p_description),started_at=p_start,stopped_at=p_stop,correction_round=p_correction_round,change_request=p_change_request,change_round=p_change_round,extra_work=p_extra_work,approved_at=null,approved_by=null,approved_rate_cents=null where id=p_entry returning * into updated;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'time.edit',p_entry,jsonb_build_object('reason',btrim(p_reason),'before',to_jsonb(t),'after',to_jsonb(updated),'approval_revoked',t.approved_at is not null));
end $$;
revoke all on function public.nc_time_revision(),public.nc_edit_time(uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,text,integer,text,integer,text) from public,anon,authenticated;
grant execute on function public.nc_edit_time(uuid,uuid,integer,uuid,text,text,text,timestamptz,timestamptz,text,integer,text,integer,text) to service_role;
notify pgrst, 'reload schema';
commit;
