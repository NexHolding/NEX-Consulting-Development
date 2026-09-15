begin;
create table public.nc_credentials (
 id uuid primary key, customer_id uuid not null references public.nc_customers(id),
 service text not null check(length(service) between 2 and 120), label text not null default '' check(length(label)<=160),
 login_url text not null default '' check(length(login_url)<=500), username text not null check(length(username) between 1 and 320),
 password_ciphertext text not null check(password_ciphertext like 'v1.%' and length(password_ciphertext)<=24000),
 two_factor text not null default 'Unbekannt', approval text not null default 'Unbekannt', notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,id)
);
create index on public.nc_credentials(customer_id);
create table public.nc_customer_infrastructure (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.nc_customers(id), domain text not null check(length(domain) between 3 and 253),
 registrar text not null default '', dns_provider text not null default '', hosting_provider text not null default '',
 email_provider text not null default '', sending_provider text not null default '', from_name text not null default '', from_email text not null default '', reply_to_email text not null default '',
 smtp_host text not null default '', smtp_port integer check(smtp_port between 1 and 65535), smtp_security text not null default 'Unbekannt',
 credential_id uuid, notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(customer_id,credential_id) references public.nc_credentials(customer_id,id)
);
create index on public.nc_customer_infrastructure(customer_id);
alter table public.nc_credentials enable row level security;
alter table public.nc_customer_infrastructure enable row level security;
revoke all on public.nc_credentials, public.nc_customer_infrastructure from public, anon, authenticated;
grant all on public.nc_credentials, public.nc_customer_infrastructure to service_role;
-- Writes and audit entries form one transaction; secrets never enter audit detail.
create function public.nc_write_credential(p_user uuid,p_customer uuid,p_id uuid,p_action text,p_fields jsonb,p_ciphertext text default null)
returns void language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 if p_action='create' then
  insert into nc_credentials(id,customer_id,service,label,login_url,username,password_ciphertext,two_factor,approval,notes)
  values(p_id,p_customer,p_fields->>'service',p_fields->>'label',p_fields->>'login_url',p_fields->>'username',p_ciphertext,p_fields->>'two_factor',p_fields->>'approval',p_fields->>'notes');
 elsif p_action='update' then
  update nc_credentials set service=p_fields->>'service',label=p_fields->>'label',login_url=p_fields->>'login_url',username=p_fields->>'username',password_ciphertext=coalesce(p_ciphertext,password_ciphertext),two_factor=p_fields->>'two_factor',approval=p_fields->>'approval',notes=p_fields->>'notes',updated_at=now() where id=p_id and customer_id=p_customer;
  if not found then raise exception 'NOT_FOUND'; end if;
 elsif p_action='delete' then
  update nc_customer_infrastructure set credential_id=null,updated_at=now() where customer_id=p_customer and credential_id=p_id;
  delete from nc_credentials where id=p_id and customer_id=p_customer;
  if not found then raise exception 'NOT_FOUND'; end if;
 else raise exception 'INVALID_ACTION'; end if;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'credential.'||p_action,p_id,jsonb_build_object('customer_id',p_customer));
end $$;
revoke all on function public.nc_write_credential(uuid,uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.nc_write_credential(uuid,uuid,uuid,text,jsonb,text) to service_role;
notify pgrst, 'reload schema';
commit;
