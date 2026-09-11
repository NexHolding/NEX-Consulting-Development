begin;
create or replace function public.nc_generate_billing() returns integer language plpgsql security invoker set search_path=public as $$
declare s record; period_start date; count_new integer:=0; inserted integer;
begin
perform pg_advisory_xact_lock(hashtextextended('nc_billing',0));
for s in select sub.*,p.customer_id,p.name as project_name from nc_subscriptions sub join nc_projects p on p.id=sub.project_id where sub.active loop
 for period_start in select d::date from generate_series(date_trunc('month',s.starts_on::timestamp),date_trunc('month',least(current_date,coalesce(s.ends_on,current_date))::timestamp),interval '1 month') d loop
  if s.starts_on>current_date then continue; end if;
  insert into nc_invoices(customer_id,project_id,subscription_id,period,subject,net_cents,items) values(s.customer_id,s.project_id,s.id,to_char(period_start,'YYYY-MM'),s.plan||' · '||s.project_name,s.monthly_cents,jsonb_build_array(jsonb_build_object('description',s.plan||' · '||to_char(period_start,'MM/YYYY'),'quantity',1,'unit_cents',s.monthly_cents))) on conflict(subscription_id,period) do nothing;
  get diagnostics inserted=row_count;count_new:=count_new+inserted;
 end loop;
end loop;
return count_new;
end $$;

alter table public.nc_subscriptions add constraint nc_subscription_month_start check (extract(day from starts_on)=1 and starts_on>=date '2020-01-01');
commit;
