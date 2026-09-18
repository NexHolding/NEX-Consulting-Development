begin;
set local lock_timeout='5s';
create table public.nc_finance_brands(code text primary key,name text not null,active boolean not null default true);
insert into public.nc_finance_brands(code,name) values ('nex','NEX Consulting · Allgemein'),('insolvenzhelden','Insolvenzhelden'),('finanzhelden','Finanzhelden'),('goldhelden','Goldhelden'),('posthelden','Posthelden'),('unassigned','Zuordnung offen');
create table public.nc_finance_sources(code text primary key,name text not null,base_url text,token_hash text,credential_ciphertext text,enabled boolean not null default false,status text not null default 'prepared',last_sync timestamptz,last_generated timestamptz,last_error text,record_count integer not null default 0);
insert into public.nc_finance_sources(code,name,enabled,status) values ('nex','NEX Consulting',true,'local'),('insolvenzhelden','Insolvenzhelden',false,'prepared'),('finanzhelden','Finanzhelden',false,'prepared'),('goldhelden','Goldhelden',false,'prepared'),('posthelden','Posthelden',false,'prepared');
create table public.nc_finance_records(
 id uuid primary key default gen_random_uuid(),brand text not null references public.nc_finance_brands(code),source text not null default 'nex' references public.nc_finance_sources(code),external_id text not null,
 kind text not null check(kind in ('document','bank','asset','depreciation','payroll')),state text not null default 'draft' check(state in ('draft','posted','reversed')),data jsonb not null,attachment jsonb,
 version integer not null default 0,source_revision text,classification_override boolean not null default false,missing boolean not null default false,
 reversal_id uuid references public.nc_finance_records(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(source,kind,external_id),
 check(jsonb_typeof(data)='object'),check(data->>'currency'='EUR'),check((data->>'date')::date is not null)
);
create index nc_finance_scope on public.nc_finance_records(brand,kind,source);
create index nc_finance_period on public.nc_finance_records((data->>'date'));
create table public.nc_finance_matches(id uuid primary key default gen_random_uuid(),bank_id uuid not null references public.nc_finance_records(id),document_id uuid not null references public.nc_finance_records(id),amount bigint not null check(amount>0),created_at timestamptz not null default now(),unique(bank_id,document_id));
create table public.nc_finance_payments(id uuid primary key default gen_random_uuid(),document_id uuid not null unique references public.nc_finance_records(id),state text not null default 'prepared' check(state in ('prepared','approved','cancelled')),created_at timestamptz not null default now());
create table public.nc_finance_settings(id integer primary key check(id=1),allocation jsonb not null default '{"mode":"none","weights":{}}');
insert into public.nc_finance_settings(id) values(1);
create table public.nc_finance_sync_batches(source text not null references public.nc_finance_sources(code),batch_id text not null,body_hash text not null,records integer not null,created_at timestamptz not null default now(),primary key(source,batch_id));
create table public.nc_finance_audit(id bigint generated always as identity primary key,user_id uuid references public.nc_users(id),action text not null,record_id uuid,detail jsonb not null default '{}',created_at timestamptz not null default now());
create table public.nc_finance_periods(period text primary key check(period~'^\d{4}-(0[1-9]|1[0-2])$'),closed_at timestamptz not null default now(),closed_by uuid references public.nc_users(id));
create function public.nc_finance_admin(p_user uuid) returns void language plpgsql security invoker set search_path=public as $$begin if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED';end if;end$$;
create function public.nc_finance_open(p_date text) returns void language plpgsql security invoker set search_path=public as $$begin if exists(select 1 from nc_finance_periods where period=left(p_date,7)) then raise exception 'Dieser Monat ist gesperrt. Für Korrekturen einen offenen Monat verwenden.';end if;end$$;
create function public.nc_finance_valid(p_kind text,p_data jsonb) returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_kind='document' and p_data->>'document_kind' in ('incoming_invoice','outgoing_invoice') then
  if (p_data->>'gross')::bigint<>(p_data->>'net')::bigint+(p_data->>'tax')::bigint then raise exception 'Netto plus Steuer muss Brutto ergeben.';end if;
  if coalesce(p_data->>'debit','')!~'^\d{4,8}$' or coalesce(p_data->>'credit','')!~'^\d{4,8}$' or ((p_data->>'tax')::bigint<>0 and coalesce(p_data->>'tax_account','')!~'^\d{4,8}$') then raise exception 'Bitte Soll-, Haben- und gegebenenfalls Steuerkonto angeben.';end if;
  if (p_data->>'gross')::bigint=0 or sign((p_data->>'net')::bigint)<>sign((p_data->>'gross')::bigint) or ((p_data->>'tax')::bigint<>0 and sign((p_data->>'tax')::bigint)<>sign((p_data->>'gross')::bigint)) then raise exception 'Bitte Rechnungsbeträge und Vorzeichen prüfen.';end if;
 end if;
 if p_kind='asset' and ((p_data->>'acquisition_cost')::bigint<=(p_data->>'residual_value')::bigint or coalesce(p_data->>'in_service','')='') then raise exception 'Anschaffungskosten, Restwert und Inbetriebnahme prüfen.';end if;
end$$;
create function public.nc_finance_save(p_user uuid,p_id uuid,p_version integer,p_brand text,p_kind text,p_data jsonb,p_attachment jsonb default null,p_external text default null) returns uuid language plpgsql security invoker set search_path=public as $$
declare old nc_finance_records;new_id uuid:=coalesce(p_id,gen_random_uuid());
begin
 perform nc_finance_admin(p_user);perform pg_advisory_xact_lock(hashtextextended('nc_finance',0));perform nc_finance_open(p_data->>'date');
 if p_id is not null then
  select * into old from nc_finance_records where id=p_id for update;
  if old.id is null or old.source<>'nex' or old.state<>'draft' then raise exception 'Nur eigene Entwürfe können bearbeitet werden.';end if;
  if old.version is distinct from p_version then raise exception 'Der Eintrag wurde inzwischen geändert. Bitte neu laden.';end if;
  perform nc_finance_open(old.data->>'date');
  update nc_finance_records set brand=p_brand,kind=p_kind,data=p_data,version=version+1,updated_at=now() where id=p_id;
 else
  insert into nc_finance_records(id,brand,kind,data,attachment,external_id) values(new_id,p_brand,p_kind,p_data,p_attachment,coalesce(p_external,new_id::text));
 end if;
 insert into nc_finance_audit(user_id,action,record_id,detail) values(p_user,'record.save',new_id,jsonb_build_object('before',case when old.id is null then null else to_jsonb(old) end,'data',p_data));return new_id;
end$$;
create function public.nc_finance_action(p_user uuid,p_id uuid,p_version integer,p_action text,p_detail jsonb default '{}') returns void language plpgsql security invoker set search_path=public as $$
declare r nc_finance_records;compensation uuid;copy jsonb;new_date text;remaining bigint;
begin
 perform nc_finance_admin(p_user);perform pg_advisory_xact_lock(hashtextextended('nc_finance',0));select * into r from nc_finance_records where id=p_id for update;
 if r.id is null then raise exception 'Eintrag nicht gefunden.';end if;
 if r.version is distinct from p_version then raise exception 'Der Eintrag wurde inzwischen geändert. Bitte neu laden.';end if;
 if p_action='classify' then
  if not exists(select 1 from nc_finance_brands where code=p_detail->>'brand' and active) then raise exception 'Kostenstelle fehlt.';end if;
  perform nc_finance_open(r.data->>'date');update nc_finance_records set brand=p_detail->>'brand',classification_override=true,version=version+1,updated_at=now() where id=p_id;
 elsif p_action='post' then
  if r.source<>'nex' or r.state<>'draft' then raise exception 'Nur eigene Entwürfe können festgeschrieben werden.';end if;
  if r.brand='unassigned' then raise exception 'Bitte zuerst die Kostenstelle zuordnen.';end if;
  perform nc_finance_open(r.data->>'date');perform nc_finance_valid(r.kind,r.data);
  if r.kind='document' and r.data->>'document_kind' not in ('incoming_invoice','outgoing_invoice') then raise exception 'Lieferscheine und Unterlagen sind keine Buchung.';end if;
  update nc_finance_records set state='posted',version=version+1,updated_at=now() where id=p_id;
 elsif p_action='reverse' then
  if r.source<>'nex' or r.state<>'posted' or r.reversal_id is not null or r.kind not in ('document','depreciation') then raise exception 'Dieser Eintrag kann hier nicht storniert werden.';end if;
  if length(btrim(coalesce(p_detail->>'reason','')))<3 then raise exception 'Bitte Stornogrund angeben.';end if;
  new_date:=p_detail->>'date';perform nc_finance_open(new_date);if new_date::date<(r.data->>'date')::date then raise exception 'Stornodatum liegt vor dem Original.';end if;
  compensation:=gen_random_uuid();copy:=r.data||jsonb_build_object('title','Storno: '||(r.data->>'title'),'date',new_date,'net',-(r.data->>'net')::bigint,'tax',-(r.data->>'tax')::bigint,'gross',-(r.data->>'gross')::bigint,'reference','ST-'||left(compensation::text,8),'notes',p_detail->>'reason','linked_id',p_id,'payment_status','not_applicable','paid_on',null);
  insert into nc_finance_records(id,brand,source,external_id,kind,state,data,attachment,reversal_id) values(compensation,r.brand,'nex',compensation::text,r.kind,'posted',copy,r.attachment,p_id);
  update nc_finance_records set reversal_id=compensation,version=version+1,updated_at=now() where id=p_id;
  update nc_finance_payments set state='cancelled' where document_id=p_id;
 elsif p_action in ('payment_prepare','payment_approve') then
  if r.source<>'nex' or r.kind<>'document' or r.state<>'posted' or r.reversal_id is not null or r.data->>'document_kind'<>'incoming_invoice' or (r.data->>'gross')::bigint<=0 or r.data->>'payment_status'='paid' then raise exception 'Nur offene eigene Eingangsrechnungen können zur Zahlung vorbereitet werden.';end if;
  remaining:=(r.data->>'gross')::bigint-coalesce((select sum(amount) from nc_finance_matches where document_id=p_id),0);if remaining<=0 then raise exception 'Beleg bereits vollständig abgeglichen.';end if;
  if p_action='payment_prepare' then insert into nc_finance_payments(document_id) values(p_id) on conflict(document_id) do update set state='prepared';else update nc_finance_payments set state='approved' where document_id=p_id and state='prepared';if not found then raise exception 'Zahlung zuerst vorbereiten.';end if;end if;
 else raise exception 'Unbekannte Aktion.';end if;
 insert into nc_finance_audit(user_id,action,record_id,detail) values(p_user,p_action,p_id,jsonb_build_object('before',to_jsonb(r),'request',p_detail));
end$$;
create function public.nc_finance_match(p_user uuid,p_bank uuid,p_document uuid,p_amount bigint) returns void language plpgsql security invoker set search_path=public as $$
declare b nc_finance_records;d nc_finance_records;br bigint;dr bigint;
begin
 perform nc_finance_admin(p_user);perform pg_advisory_xact_lock(hashtextextended('nc_finance',0));select * into b from nc_finance_records where id=p_bank for update;select * into d from nc_finance_records where id=p_document for update;
 if b.kind<>'bank' or d.kind<>'document' or b.source<>'nex' or d.source<>'nex' or b.state<>'posted' or d.state<>'posted' or d.reversal_id is not null or d.data->>'document_kind' not in ('incoming_invoice','outgoing_invoice') then raise exception 'Nur eigene gebuchte Bankumsätze und Rechnungen zuordnen.';end if;
 if b.id is null or d.id is null then raise exception 'Bankumsatz oder Beleg fehlt.';end if;
 if sign((b.data->>'gross')::bigint) <> sign((d.data->>'gross')::bigint)*(case when d.data->>'document_kind'='incoming_invoice' then -1 else 1 end) then raise exception 'Zahlungsrichtung passt nicht zum Beleg.';end if;
 br:=abs((b.data->>'gross')::bigint)-coalesce((select sum(amount) from nc_finance_matches where bank_id=p_bank),0);dr:=abs((d.data->>'gross')::bigint)-coalesce((select sum(amount) from nc_finance_matches where document_id=p_document),0);
 if p_amount is null or p_amount<=0 or p_amount>least(br,dr) then raise exception 'Zuordnungsbetrag übersteigt den offenen Betrag.';end if;
 insert into nc_finance_matches(bank_id,document_id,amount) values(p_bank,p_document,p_amount) on conflict(bank_id,document_id) do update set amount=nc_finance_matches.amount+excluded.amount;
 if p_amount=dr then update nc_finance_records set data=data||jsonb_build_object('payment_status','paid','paid_on',b.data->>'date'),version=version+1,updated_at=now() where id=p_document;end if;
 insert into nc_finance_audit(user_id,action,record_id,detail) values(p_user,'bank.match',p_document,jsonb_build_object('bank_id',p_bank,'amount',p_amount));
end$$;
create function public.nc_finance_import(p_source text,p_batch text,p_hash text,p_records jsonb,p_snapshot boolean,p_generated timestamptz) returns integer language plpgsql security invoker set search_path=public as $$
declare item jsonb;existing nc_finance_records;n integer:=0;prev_hash text;
begin
 perform pg_advisory_xact_lock(hashtextextended('nc_finance',0));
 if not exists(select 1 from nc_finance_sources where code=p_source and code<>'nex' and enabled) then raise exception 'Schnittstelle nicht freigeschaltet.';end if;
 select body_hash into prev_hash from nc_finance_sync_batches where source=p_source and batch_id=p_batch;
 if prev_hash is not null then if prev_hash<>p_hash then raise exception 'Batch-ID bereits mit anderem Inhalt verwendet.';end if;
 update nc_finance_sources set last_sync=now() where code=p_source and p_generated>=last_generated;return 0;end if;
 if p_generated<(select last_generated from nc_finance_sources where code=p_source) then raise exception 'Älterer Quellstand wurde abgelehnt.';end if;
 for item in select value from jsonb_array_elements(p_records) loop
  select * into existing from nc_finance_records where source=p_source and kind=item->>'kind' and external_id=item->>'external_id' for update;
  if existing.id is not null and existing.source_revision=item->>'revision' then
   if existing.data<>item->'data' or existing.state<>item->>'state' or existing.attachment is distinct from nullif(item->'attachment','null'::jsonb) then raise exception 'Unveränderte Quellversion mit abweichendem Inhalt.';end if;
   continue;
  end if;
  perform nc_finance_open(item->'data'->>'date');if existing.id is not null then perform nc_finance_open(existing.data->>'date');end if;
  insert into nc_finance_records(brand,source,external_id,kind,state,data,source_revision,attachment) values(item->>'brand',p_source,item->>'external_id',item->>'kind',item->>'state',item->'data',item->>'revision',nullif(item->'attachment','null'::jsonb))
  on conflict(source,kind,external_id) do update set brand=case when nc_finance_records.classification_override then nc_finance_records.brand else excluded.brand end,state=excluded.state,data=excluded.data,source_revision=excluded.source_revision,attachment=excluded.attachment,version=nc_finance_records.version+1,updated_at=now();
  insert into nc_finance_audit(action,record_id,detail) values('source.import',existing.id,jsonb_build_object('source',p_source,'external_id',item->>'external_id','before',case when existing.id is null then null else to_jsonb(existing) end,'after',item));n:=n+1;
 end loop;
 insert into nc_finance_sync_batches(source,batch_id,body_hash,records) values(p_source,p_batch,p_hash,n);
 if p_snapshot then update nc_finance_records r set missing=true where r.source=p_source and not exists(select 1 from jsonb_array_elements(p_records) i where i->>'external_id'=r.external_id and i->>'kind'=r.kind);end if;
 update nc_finance_records r set missing=false where r.source=p_source and exists(select 1 from jsonb_array_elements(p_records) i where i->>'external_id'=r.external_id and i->>'kind'=r.kind);
 update nc_finance_sources set status=case when p_snapshot then 'connected' else 'partial' end,last_sync=now(),last_generated=p_generated,last_error=null,record_count=(select count(*) from nc_finance_records where source=p_source and not missing) where code=p_source;
 return n;
end$$;

create function public.nc_finance_depreciate(p_user uuid,p_asset uuid,p_month date,p_version integer,p_data jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare a nc_finance_records;idx integer;basis bigint;amount bigint;new_id uuid;
begin
 perform nc_finance_admin(p_user);perform pg_advisory_xact_lock(hashtextextended('nc_finance',0));select * into a from nc_finance_records where id=p_asset for update;
 if a.id is null or a.source<>'nex' or a.kind<>'asset' or a.state<>'posted' or a.version<>p_version then raise exception 'Anlage nicht verfügbar oder inzwischen verändert.';end if;
 if p_month<>date_trunc('month',p_month)::date or p_month>current_date then raise exception 'Nur aktuelle oder vergangene AfA-Monate buchen.';end if;
 idx:=(extract(year from p_month)::integer-extract(year from (a.data->>'in_service')::date)::integer)*12+extract(month from p_month)::integer-extract(month from (a.data->>'in_service')::date)::integer;
 if idx<0 or idx>=(a.data->>'life_months')::integer then raise exception 'Monat liegt außerhalb der Nutzungsdauer.';end if;
 basis:=(a.data->>'acquisition_cost')::bigint-(a.data->>'residual_value')::bigint;
 amount:=floor(basis::numeric*(idx+1)/(a.data->>'life_months')::integer)-floor(basis::numeric*idx/(a.data->>'life_months')::integer);
 if amount<=0 or (p_data->>'net')::bigint<>amount or (p_data->>'gross')::bigint<>amount or (p_data->>'tax')::bigint<>0 or p_data->>'date'<>p_month::text or p_data->>'debit'<>a.data->>'debit' or p_data->>'credit'<>a.data->>'credit' or (p_data->>'linked_id')::uuid<>p_asset then raise exception 'AfA-Betrag oder Kontierung stimmt nicht mit der Anlage überein.';end if;
 if coalesce(a.data->>'debit','')!~'^\d{4,8}$' or coalesce(a.data->>'credit','')!~'^\d{4,8}$' then raise exception 'AfA-Konten fehlen.';end if;
 new_id:=nc_finance_save(p_user,null,null,a.brand,'depreciation',p_data,null,'afa:'||p_asset||':'||p_month);
 perform nc_finance_action(p_user,new_id,0,'post','{}');
end$$;
create function public.nc_finance_bank_import(p_user uuid,p_brand text,p_rows jsonb) returns integer language plpgsql security invoker set search_path=public as $$
declare item jsonb;existing nc_finance_records;n integer:=0;new_id uuid;
begin
 perform nc_finance_admin(p_user);perform pg_advisory_xact_lock(hashtextextended('nc_finance',0));
 for item in select value from jsonb_array_elements(p_rows) loop
  select * into existing from nc_finance_records where source='nex' and kind='bank' and external_id=item->>'external_id';
  if existing.id is not null then if existing.data<>item->'data' or existing.brand<>p_brand then raise exception 'Eine Umsatz-ID wurde bereits mit abweichenden Daten importiert.';end if;continue;end if;
  new_id:=nc_finance_save(p_user,null,null,p_brand,'bank',item->'data',null,item->>'external_id');perform nc_finance_action(p_user,new_id,0,'post','{}');n:=n+1;
 end loop;return n;
end$$;
revoke all on function public.nc_finance_depreciate(uuid,uuid,date,integer,jsonb),public.nc_finance_bank_import(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nc_finance_depreciate(uuid,uuid,date,integer,jsonb),public.nc_finance_bank_import(uuid,text,jsonb) to service_role;

do $$declare t text;begin foreach t in array array['nc_finance_brands','nc_finance_sources','nc_finance_records','nc_finance_matches','nc_finance_payments','nc_finance_settings','nc_finance_sync_batches','nc_finance_audit','nc_finance_periods'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end$$;
revoke all on function public.nc_finance_admin(uuid),public.nc_finance_open(text),public.nc_finance_valid(text,jsonb),public.nc_finance_save(uuid,uuid,integer,text,text,jsonb,jsonb,text),public.nc_finance_action(uuid,uuid,integer,text,jsonb),public.nc_finance_match(uuid,uuid,uuid,bigint),public.nc_finance_import(text,text,text,jsonb,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.nc_finance_admin(uuid),public.nc_finance_open(text),public.nc_finance_valid(text,jsonb),public.nc_finance_save(uuid,uuid,integer,text,text,jsonb,jsonb,text),public.nc_finance_action(uuid,uuid,integer,text,jsonb),public.nc_finance_match(uuid,uuid,uuid,bigint),public.nc_finance_import(text,text,text,jsonb,boolean,timestamptz) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nex-finance','nex-finance',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
notify pgrst,'reload schema';
commit;
