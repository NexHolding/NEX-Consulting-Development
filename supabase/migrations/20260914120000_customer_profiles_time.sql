begin;
alter table public.nc_customers
 add column phone text not null default '',
 add column billing_name text not null default '',
 add column billing_email text not null default '',
 add column billing_address text not null default '',
 add column vat_id text not null default '',
 add column payment_terms_days integer not null default 14 check(payment_terms_days between 0 and 365),
 add column source text not null default 'NEX Consulting';
create function public.nc_manual_time(p_user uuid,p_project uuid,p_kind text,p_category text,p_description text,p_start timestamptz,p_stop timestamptz) returns uuid language plpgsql security invoker set search_path=public as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if p_start is null or p_stop is null or p_stop<=p_start or p_stop>now() or p_stop-p_start>interval '24 hours' then raise exception 'Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.'; end if;
 if p_kind not in ('internal','external') or p_category not in ('active','processing','waiting','break') or length(trim(p_description))<3 then raise exception 'Zeitart oder Leistungsbeschreibung fehlt.'; end if;
 if not exists(select 1 from nc_projects where id=p_project and status<>'Archiviert') then raise exception 'Projekt nicht verfügbar.'; end if;
 if exists(select 1 from nc_time_entries where user_id=p_user and kind=p_kind and started_at<p_stop and coalesce(stopped_at,'infinity'::timestamptz)>p_start) then raise exception 'Der Zeitraum überschneidet sich mit einer bereits erfassten Zeit derselben Zeitart.'; end if;
 insert into nc_time_entries(user_id,project_id,kind,category,description,started_at,stopped_at) values(p_user,p_project,p_kind,p_category,trim(p_description),p_start,p_stop) returning id into result;
 insert into nc_audit(user_id,action,entity_id) values(p_user,'time.manual',result);
 return result;
end $$;
revoke all on function public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz) to service_role;
commit;
