begin;
create table public.nc_users(id uuid primary key default gen_random_uuid(), username text not null unique, password_hash text not null, role text not null default 'global_admin' check(role in ('global_admin','employee','finance','customer')), active boolean not null default true, created_at timestamptz not null default now());
create table public.nc_sessions(token_hash text primary key, user_id uuid not null references public.nc_users(id) on delete cascade, expires_at timestamptz not null, created_at timestamptz not null default now());
create table public.nc_rate_limits(key text primary key, count integer not null, window_start timestamptz not null default now());
create table public.nc_customers(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160), contact text not null default '', email text not null default '', address text not null default '', notes text not null default '', created_at timestamptz not null default now());
create table public.nc_projects(id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.nc_customers(id), name text not null, status text not null default 'Konzeption' check(status in ('Konzeption','Design','Entwicklung','Kundenprüfung','Live','Betreuung','Pausiert','Archiviert')), package text not null default 'Launch', budget_cents bigint not null default 0 check(budget_cents>=0), hourly_rate_cents integer not null default 14000 check(hourly_rate_cents>=0), waiting_billable boolean not null default false, notes text not null default '', created_at timestamptz not null default now());
create table public.nc_time_entries(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.nc_users(id), project_id uuid not null references public.nc_projects(id), kind text not null check(kind in ('internal','external')), category text not null default 'active' check(category in ('active','processing','waiting','break')), description text not null default '', started_at timestamptz not null default now(), stopped_at timestamptz, approved_at timestamptz, approved_by uuid references public.nc_users(id), check(stopped_at is null or stopped_at>=started_at), check(approved_at is null or (kind='external' and stopped_at is not null)));
create unique index nc_one_running_timer on public.nc_time_entries(user_id,kind) where stopped_at is null;
create table public.nc_tasks(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.nc_projects(id),title text not null,done boolean not null default false,due_date date,created_at timestamptz not null default now());
create table public.nc_leads(id uuid primary key default gen_random_uuid(),name text not null,company text not null default '',email text not null,package text not null default '',message text not null,status text not null default 'Neu',created_at timestamptz not null default now());
create table public.nc_subscriptions(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.nc_projects(id),plan text not null check(plan in ('Care','Care Plus','Care Dedicated')),monthly_cents integer not null check(monthly_cents>0),included_minutes integer not null check(included_minutes>=0),starts_on date not null,ends_on date,active boolean not null default true,created_at timestamptz not null default now(),check(ends_on is null or ends_on>=starts_on));
create unique index nc_one_subscription on public.nc_subscriptions(project_id) where active;
create table public.nc_invoices(id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.nc_customers(id),project_id uuid not null references public.nc_projects(id),subscription_id uuid references public.nc_subscriptions(id),period text,number text unique,status text not null default 'draft' check(status in ('draft','issued','paid','cancelled')),subject text not null,net_cents bigint not null check(net_cents>=0),tax_basis_points integer not null default 1900,items jsonb not null default '[]',created_at timestamptz not null default now(),issued_at timestamptz,paid_at timestamptz,unique(subscription_id,period));
create table public.nc_invoice_times(time_id uuid primary key references public.nc_time_entries(id),invoice_id uuid not null references public.nc_invoices(id));
create table public.nc_audit(id bigint generated always as identity primary key,user_id uuid references public.nc_users(id),action text not null,entity_id uuid,detail jsonb not null default '{}',created_at timestamptz not null default now());
create index nc_time_project on public.nc_time_entries(project_id,started_at);
create index nc_session_expiry on public.nc_sessions(expires_at);

create function public.nc_take_limit(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
insert into nc_rate_limits(key,count) values(p_key,1) on conflict(key) do update set count=case when nc_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else nc_rate_limits.count+1 end,window_start=case when nc_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else nc_rate_limits.window_start end returning count into n;
return n<=p_max;
end $$;

create function public.nc_timer(p_user uuid,p_project uuid,p_kind text,p_action text,p_category text default 'active',p_description text default '') returns uuid language plpgsql security invoker set search_path=public as $$
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
 insert into nc_time_entries(user_id,project_id,kind,category,description) values(p_user,p_project,p_kind,p_category,p_description) returning id into result;
elsif p_action='stop' then
 update nc_time_entries set stopped_at=now() where user_id=p_user and kind=p_kind and stopped_at is null returning id into result;
else raise exception 'Ungültige Aktion'; end if;
insert into nc_audit(user_id,action,entity_id) values(p_user,'timer.'||p_action,result);
return result;
end $$;

create function public.nc_approve_time(p_user uuid,p_entry uuid) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries; p nc_projects;
begin
select * into t from nc_time_entries where id=p_entry for update;
if t.id is null or t.kind<>'external' or t.stopped_at is null or t.category='break' then raise exception 'Nur abgeschlossene externe Leistungen freigeben.'; end if;
select * into p from nc_projects where id=t.project_id;
if t.category in ('waiting','processing') and not p.waiting_billable then raise exception 'Warte-/Verarbeitungszeit ist im Projekt nicht als abrechenbar vereinbart.'; end if;
if length(trim(t.description))<3 then raise exception 'Leistungsbeschreibung fehlt.'; end if;
update nc_time_entries set approved_at=now(),approved_by=p_user where id=p_entry;
insert into nc_audit(user_id,action,entity_id) values(p_user,'time.approve',p_entry);
end $$;

create function public.nc_generate_billing() returns integer language plpgsql security invoker set search_path=public as $$
declare s record; period_start date; count_new integer:=0; inserted integer;
begin
perform pg_advisory_xact_lock(hashtextextended('nc_billing',0));
for s in select s.*,p.customer_id,p.name as project_name from nc_subscriptions s join nc_projects p on p.id=s.project_id where s.active loop
 for period_start in select d::date from generate_series(date_trunc('month',s.starts_on::timestamp),date_trunc('month',least(current_date,coalesce(s.ends_on,current_date))::timestamp),interval '1 month') d loop
  if s.starts_on>current_date then continue; end if;
  insert into nc_invoices(customer_id,project_id,subscription_id,period,subject,net_cents,items) values(s.customer_id,s.project_id,s.id,to_char(period_start,'YYYY-MM'),s.plan||' · '||s.project_name,s.monthly_cents,jsonb_build_array(jsonb_build_object('description',s.plan||' · '||to_char(period_start,'MM/YYYY'),'quantity',1,'unit_cents',s.monthly_cents))) on conflict(subscription_id,period) do nothing;
  get diagnostics inserted=row_count;count_new:=count_new+inserted;
 end loop;
end loop;
return count_new;
end $$;

do $$ declare t text; begin
foreach t in array array['nc_users','nc_sessions','nc_rate_limits','nc_customers','nc_projects','nc_time_entries','nc_tasks','nc_leads','nc_subscriptions','nc_invoices','nc_invoice_times','nc_audit'] loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from anon, authenticated',t);
execute format('grant all on public.%I to service_role',t);
end loop;
end $$;
revoke all on function public.nc_take_limit(text,integer,integer),public.nc_timer(uuid,uuid,text,text,text,text),public.nc_approve_time(uuid,uuid),public.nc_generate_billing() from public,anon,authenticated;
grant execute on function public.nc_take_limit(text,integer,integer),public.nc_timer(uuid,uuid,text,text,text,text),public.nc_approve_time(uuid,uuid),public.nc_generate_billing() to service_role;
grant usage,select on all sequences in schema public to service_role;
commit;
