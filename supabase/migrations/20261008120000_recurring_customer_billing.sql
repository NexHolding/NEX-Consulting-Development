begin;
create table public.nc_billing_products (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(name) between 2 and 160),
 factor numeric(7,4) not null default 1.3 check(factor between 1 and 100), active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into public.nc_billing_products(name) values ('Domain'),('E-Mail'),('OpenAI'),('Anthropic'),('GitHub'),('Supabase'),('Apple Developer / App-Kosten'),('Vercel / Hosting'),('Software-Lizenz'),('Speicher / Backup'),('Sonstige Leistung');
create table public.nc_recurring_costs (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.nc_customers(id),
 project_id uuid references public.nc_projects(id), product_id uuid not null references public.nc_billing_products(id),
 label text not null check(length(label) between 2 and 200), cost_cents bigint not null check(cost_cents between 1 and 1000000000),
 factor numeric(7,4) not null check(factor between 1 and 100),
 monthly_cents bigint generated always as (round(cost_cents * factor)) stored,
 starts_on date not null check(starts_on between date '2020-01-01' and date '2100-12-31'), ends_on date,
 active boolean not null default true, created_at timestamptz not null default now(), check(ends_on is null or ends_on>=starts_on)
);
create index nc_recurring_customer on public.nc_recurring_costs(customer_id);
alter table public.nc_billing_products enable row level security;
alter table public.nc_recurring_costs enable row level security;
revoke all on public.nc_billing_products,public.nc_recurring_costs from anon,authenticated;
grant all on public.nc_billing_products,public.nc_recurring_costs to service_role;
alter table public.nc_subscriptions drop constraint nc_subscriptions_plan_check;
alter table public.nc_subscriptions add constraint nc_subscription_plan_length check(length(plan) between 2 and 160);
alter table public.nc_subscriptions drop constraint nc_subscription_month_start;
alter table public.nc_subscriptions add constraint nc_subscription_start_range check(starts_on between date '2020-01-01' and date '2100-12-31');
-- Allow a successor contract after an agreed end, while rejecting overlaps.
drop index public.nc_one_subscription;
create function public.nc_subscription_no_overlap() returns trigger language plpgsql set search_path=public as $$
begin
 perform 1 from nc_projects where id=new.project_id for update;
 if new.active and exists(select 1 from nc_subscriptions where project_id=new.project_id and id<>new.id and active and daterange(starts_on,ends_on,'[]') && daterange(new.starts_on,new.ends_on,'[]')) then
  raise exception 'Für diesen Zeitraum besteht bereits ein Betreuungsvertrag im Projekt.';
 end if;
 return new;
end $$;
create trigger nc_subscription_no_overlap before insert or update on public.nc_subscriptions for each row execute function public.nc_subscription_no_overlap();
alter table public.nc_invoices alter column project_id drop not null;
alter table public.nc_invoices add column recurring_cost_id uuid references public.nc_recurring_costs(id);
create unique index nc_recurring_invoice_period on public.nc_invoices(recurring_cost_id,period);

-- Ownership is enforced for every insert/update, including service-role callers.
create function public.nc_recurring_cost_owner() returns trigger language plpgsql set search_path=public as $$
begin
 if new.project_id is not null and not exists(select 1 from nc_projects where id=new.project_id and customer_id=new.customer_id) then
  raise exception 'Das Projekt gehört nicht zum Kunden.';
 end if;
 if TG_OP='UPDATE' and (new.customer_id<>old.customer_id or new.project_id is distinct from old.project_id) and exists(select 1 from nc_invoices where recurring_cost_id=old.id) then
  raise exception 'Bereits abgerechnete Kosten können keinem anderen Kunden oder Projekt zugeordnet werden.';
 end if;
 return new;
end $$;
create trigger nc_recurring_cost_owner before insert or update on public.nc_recurring_costs for each row execute function public.nc_recurring_cost_owner();

-- Preserve subscriptions and extend the same serialized, idempotent monthly run.
-- Every started calendar month is billed in full; issued/draft history stays frozen.
create or replace function public.nc_generate_billing() returns integer language plpgsql security invoker set search_path=public as $$
declare s record; period_start date; count_new integer:=0; inserted integer; billing_today date:=(now() at time zone 'Europe/Berlin')::date;
begin
 perform pg_advisory_xact_lock(hashtextextended('nc_billing',0));
 for s in select sub.*,p.customer_id,p.name as project_name from nc_subscriptions sub join nc_projects p on p.id=sub.project_id where sub.active and sub.starts_on<=billing_today loop
  for period_start in select d::date from generate_series(date_trunc('month',s.starts_on::timestamp),date_trunc('month',least(billing_today,coalesce(s.ends_on,billing_today))::timestamp),interval '1 month') d loop
   insert into nc_invoices(customer_id,project_id,subscription_id,period,subject,net_cents,items)
   values(s.customer_id,s.project_id,s.id,to_char(period_start,'YYYY-MM'),s.plan||' · '||s.project_name,s.monthly_cents,
    jsonb_build_array(jsonb_build_object('description',s.plan||' · '||to_char(period_start,'MM/YYYY'),'quantity',1,'unit_cents',s.monthly_cents)))
   on conflict(subscription_id,period) do nothing;
   get diagnostics inserted=row_count;count_new:=count_new+inserted;
  end loop;
 end loop;
 for s in select * from nc_recurring_costs where active and starts_on<=billing_today loop
  for period_start in select d::date from generate_series(date_trunc('month',s.starts_on::timestamp),date_trunc('month',least(billing_today,coalesce(s.ends_on,billing_today))::timestamp),interval '1 month') d loop
   insert into nc_invoices(customer_id,project_id,recurring_cost_id,period,subject,net_cents,items)
   values(s.customer_id,s.project_id,s.id,to_char(period_start,'YYYY-MM'),s.label,s.monthly_cents,
    jsonb_build_array(jsonb_build_object('description',s.label||' · '||to_char(period_start,'MM/YYYY'),'quantity',1,'unit_cents',s.monthly_cents)))
   on conflict(recurring_cost_id,period) do nothing;
   get diagnostics inserted=row_count;count_new:=count_new+inserted;
  end loop;
 end loop;
 return count_new;
end $$;
notify pgrst, 'reload schema';
commit;
