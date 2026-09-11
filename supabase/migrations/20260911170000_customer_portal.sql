begin;
alter table nc_users add column customer_id uuid references nc_customers(id);
alter table nc_users add constraint nc_customer_identity check ((role='customer' and customer_id is not null) or (role<>'customer' and customer_id is null));
alter table nc_projects add constraint nc_project_customer unique(id,customer_id);
alter table nc_subscriptions add column customer_visible boolean not null default false;
alter table nc_invoices add column customer_visible boolean not null default false;
create table nc_documents (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references nc_customers(id), title text not null,
 kind text not null check(kind in ('Vertrag','Dokument')), body text not null default '', customer_visible boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,customer_id)
);
create table nc_websites (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references nc_customers(id), name text not null, domain text not null default '',
 project_id uuid, status text not null default 'Planung', plan text not null default '', contract_id uuid, contact text not null default '', assignee_id uuid references nc_users(id),
 features text not null default '', internal_notes text not null default '', customer_visible boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,customer_id),
 foreign key(project_id,customer_id) references nc_projects(id,customer_id), foreign key(contract_id,customer_id) references nc_documents(id,customer_id)
);
create table nc_orders (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references nc_customers(id), number text not null unique, name text not null,
 status text not null default 'Auftrag eingegangen' check(status in ('Auftrag eingegangen','Angebot beziehungsweise Vertrag ausstehend','Warten auf Unterlagen','Planung und Konzeption','Design in Bearbeitung','Entwicklung in Bearbeitung','Interne Prüfung','Kundenfreigabe erforderlich','Korrekturen werden umgesetzt','Veröffentlichung wird vorbereitet','Auftrag abgeschlossen','Auftrag pausiert')),
 progress integer not null default 0 check(progress between 0 and 100), current_step text not null default '', completed_steps text not null default '', next_step text not null default '', questions text not null default '',
 due_date date, due_kind text not null default 'Voraussichtlich' check(due_kind in ('Voraussichtlich','Vereinbart')), contact text not null default '',
 customer_visible boolean not null default false, internal_notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,customer_id)
);
create table nc_order_websites (
 order_id uuid not null, website_id uuid not null, customer_id uuid not null, primary key(order_id,website_id),
 foreign key(order_id,customer_id) references nc_orders(id,customer_id) on delete cascade,
 foreign key(website_id,customer_id) references nc_websites(id,customer_id) on delete cascade
);
create table nc_tickets (
 id uuid primary key default gen_random_uuid(), customer_id uuid not null references nc_customers(id), subject text not null, description text not null,
 status text not null default 'Eingegangen' check(status in ('Eingegangen','In Bearbeitung','Rückfrage','Gelöst')),
 assignment_status text not null default 'Website-Zuordnung erforderlich' check(assignment_status in ('Website-Zuordnung erforderlich','Vorschlag prüfen','Zugeordnet')),
 website_id uuid, order_id uuid, project_id uuid, subscription_id uuid references nc_subscriptions(id), assignee_id uuid references nc_users(id), team text not null default '',
 internal_notes text not null default '', suggestion jsonb not null default '[]', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,customer_id),
 foreign key(website_id,customer_id) references nc_websites(id,customer_id), foreign key(order_id,customer_id) references nc_orders(id,customer_id), foreign key(project_id,customer_id) references nc_projects(id,customer_id)
);
create table nc_ticket_messages (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null, customer_id uuid not null, author text not null check(author in ('Kunde','NEX Consulting')),
 body text not null, customer_visible boolean not null default false, created_at timestamptz not null default now(),
 foreign key(ticket_id,customer_id) references nc_tickets(id,customer_id) on delete cascade
);
create function nc_portal_touch() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
foreach t in array array['nc_documents','nc_websites','nc_orders','nc_order_websites','nc_tickets','nc_ticket_messages'] loop
execute format('alter table %I enable row level security',t);
execute format('revoke all on %I from anon,authenticated',t);
execute format('grant all on %I to service_role',t);
execute format('create index on %I(customer_id)',t);
end loop;
foreach t in array array['nc_documents','nc_websites','nc_orders','nc_tickets'] loop
execute format('create trigger portal_touch before update on %I for each row execute function nc_portal_touch()',t);
end loop;
end $$;
-- Replace all links atomically; composite foreign keys enforce customer ownership.
create function nc_set_order_websites(p_order uuid,p_customer uuid,p_websites uuid[]) returns void language plpgsql set search_path=public as $$
begin
perform 1 from nc_orders where id=p_order and customer_id=p_customer for update;
if not found then raise exception 'Auftrag fehlt'; end if;
delete from nc_order_websites where order_id=p_order;
insert into nc_order_websites(order_id,customer_id,website_id) select p_order,p_customer,unnest(p_websites);
end $$;
revoke all on function nc_set_order_websites(uuid,uuid,uuid[]), nc_portal_touch() from public,anon,authenticated;
grant execute on function nc_set_order_websites(uuid,uuid,uuid[]) to service_role;
commit;
