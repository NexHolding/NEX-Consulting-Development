begin;
create table public.nc_offer_catalog(id integer primary key check(id=1),version integer not null default 1 check(version>0),document jsonb not null,updated_at timestamptz not null default now());
alter table public.nc_offer_catalog enable row level security;
revoke all on public.nc_offer_catalog from public,anon,authenticated;
grant all on public.nc_offer_catalog to service_role;
insert into public.nc_offer_catalog(id,document) values(1,'{"version": 1, "points": [{"budget": 1000, "monthly": 49}, {"budget": 3000, "monthly": 99}, {"budget": 5000, "monthly": 149}, {"budget": 10000, "monthly": 299}, {"budget": 20000, "monthly": 599}, {"budget": 35000, "monthly": 1199}, {"budget": 50000, "monthly": 1999}, {"budget": 75000, "monthly": 3499}, {"budget": 100000, "monthly": 5000}], "services": [{"id": "pages", "group": "Website & Inhalte", "label": "Inhaltsseiten", "unit": "Seiten", "quantities": [1, 3, 5, 8, 15, 25, 40, 60, 80], "description": "Individuell gestaltete Inhaltsseiten; Impressum und Datenschutz zählen zusätzlich."}, {"id": "templates", "group": "Website & Inhalte", "label": "Individuelle Seitentypen", "unit": "Layouts", "quantities": [1, 2, 3, 4, 6, 8, 12, 16, 20], "description": "Wiederverwendbare Layouts für unterschiedliche Inhalte."}, {"id": "forms", "group": "Website & Inhalte", "label": "Formulare & Intake-Strecken", "unit": "Strecken", "quantities": [1, 1, 2, 3, 5, 8, 12, 16, 20], "description": "Je Strecke ein abgestimmter Ablauf mit Eingaben und Bestätigung."}, {"id": "languages", "group": "Website & Inhalte", "label": "Sprachversionen", "unit": "Sprachen", "quantities": [1, 1, 1, 1, 2, 2, 3, 4, 5], "description": "Technische Einrichtung; Übersetzungen werden vom Kunden geliefert."}, {"id": "imprint", "group": "Website & Inhalte", "label": "Impressum anlegen", "unit": "Einrichtung", "quantities": [1, 1, 1, 1, 1, 1, 1, 1, 1], "description": "Erstellung und Einbindung auf Basis der vom Kunden bereitgestellten Betreiberangaben."}, {"id": "privacy", "group": "Website & Inhalte", "label": "Individuelle Datenschutzerklärung", "unit": "Einrichtung", "quantities": [1, 1, 1, 1, 1, 1, 1, 1, 1], "description": "Aufnahme der eingesetzten Website-Dienste, Erstellung und Einbindung; Rechtsprüfung und Anbietergebühren separat."}, {"id": "seo", "group": "Website & Inhalte", "label": "SEO-Grundeinrichtung", "unit": "Einrichtung", "quantities": [1, 1, 1, 1, 1, 1, 1, 1, 1], "description": "Seitentitel, Beschreibungen, Indexierung und technische Grundlagen."}, {"id": "analytics", "group": "Website & Inhalte", "label": "Analyse- & Consent-Anbindungen", "unit": "Anbindungen", "quantities": [0, 1, 1, 2, 3, 4, 4, 6, 8], "description": "Einrichtung der vereinbarten Dienste und Einwilligungsabläufe."}, {"id": "modules", "group": "Backend & Portale", "label": "CRM- & Backend-Module", "unit": "Module", "quantities": [0, 0, 1, 3, 5, 8, 12, 18, 25], "description": "Ein Modul umfasst eine abgegrenzte Funktion mit Datenansicht und Bearbeitung."}, {"id": "customer_portals", "group": "Backend & Portale", "label": "Kundenportale", "unit": "Portale", "quantities": [0, 0, 0, 1, 1, 2, 3, 4, 5], "description": "Eigenständige Portalbereiche mit Anmeldung."}, {"id": "staff_portals", "group": "Backend & Portale", "label": "Mitarbeiterbereiche", "unit": "Bereiche", "quantities": [0, 0, 0, 1, 1, 2, 3, 4, 5], "description": "Interne Bereiche für Teamarbeit und Aufgaben."}, {"id": "finance_portals", "group": "Backend & Portale", "label": "Finance-Portale", "unit": "Portale", "quantities": [0, 0, 0, 0, 1, 1, 2, 3, 4], "description": "Übersichten für Leistungen, Belege und Freigaben; Buchhaltungsschnittstellen separat gezählt."}, {"id": "roles", "group": "Backend & Portale", "label": "Berechtigungsrollen", "unit": "Rollen", "quantities": [1, 1, 2, 3, 5, 8, 12, 16, 20], "description": "Abgestimmte Rollen mit definierten Zugriffsrechten."}, {"id": "staff_users", "group": "Backend & Portale", "label": "Eingerichtete Mitarbeiterzugänge", "unit": "Nutzer", "quantities": [1, 1, 2, 5, 10, 20, 35, 60, 100], "description": "Einrichtung und Einweisung; externe Lizenzkosten nicht enthalten."}, {"id": "customer_users", "group": "Backend & Portale", "label": "Vorgesehene aktive Kundenzugänge", "unit": "Nutzer", "quantities": [0, 0, 0, 50, 150, 500, 1500, 3500, 10000], "description": "Planungsgröße für die Auslegung; Hosting- und Verbrauchskosten separat."}, {"id": "workflows", "group": "Automatisierung & KI", "label": "Automatisierte Abläufe", "unit": "Workflows", "quantities": [0, 1, 2, 4, 8, 12, 20, 30, 40], "description": "Je Ablauf ein definierter Auslöser mit abgestimmten Folgeschritten."}, {"id": "integrations", "group": "Automatisierung & KI", "label": "Externe Schnittstellen", "unit": "Anbindungen", "quantities": [0, 1, 1, 2, 4, 6, 10, 15, 20], "description": "Anbindung einer dokumentierten API; Fremdanbieter-Lizenzen separat."}, {"id": "agents", "group": "Automatisierung & KI", "label": "KI-Agenten / Assistenten", "unit": "Agenten", "quantities": [0, 0, 0, 1, 2, 3, 5, 8, 12], "description": "Je Agent ein abgegrenzter Aufgabenbereich; Modellverbrauch separat."}, {"id": "documents", "group": "Automatisierung & KI", "label": "PDF- & Dokumentvorlagen", "unit": "Vorlagen", "quantities": [0, 0, 1, 2, 4, 6, 10, 15, 20], "description": "Individuelle Ausgabevorlagen für vereinbarte Daten."}, {"id": "migration", "group": "Zusammenarbeit & Qualität", "label": "Datenimport-Quellen", "unit": "Quellen", "quantities": [0, 0, 0, 1, 2, 3, 5, 8, 10], "description": "Ein abgestimmtes Datenformat pro Quelle; Bereinigung nach Sichtung."}, {"id": "workshops", "group": "Zusammenarbeit & Qualität", "label": "Konzept- & Schulungstermine", "unit": "Termine", "quantities": [1, 1, 2, 3, 4, 6, 8, 10, 12], "description": "Je Termin bis 60 Minuten, remote."}, {"id": "corrections", "group": "Zusammenarbeit & Qualität", "label": "Enthaltene Korrekturrunden", "unit": "Runden", "quantities": [1, 1, 2, 2, 3, 4, 5, 6, 8], "description": "Eine gebündelte Feedbackrunde innerhalb des vereinbarten Umfangs; mehrere Zeitbuchungen zählen als eine Runde."}, {"id": "changes", "group": "Zusammenarbeit & Qualität", "label": "Komplettänderungen während der Entwicklung", "unit": "Änderungen", "quantities": [0, 0, 0, 0, 1, 1, 2, 2, 3], "description": "Je Änderung ein neu abgestimmter Entwurf oder Ablauf innerhalb des vereinbarten Mengenrahmens. Kein kompletter Neuaufbau der Gesamtplattform."}, {"id": "testing", "group": "Zusammenarbeit & Qualität", "label": "Abnahme- & Testdurchläufe", "unit": "Durchläufe", "quantities": [1, 1, 1, 2, 2, 3, 3, 4, 5], "description": "Funktion, mobile Darstellung und die vereinbarten Kernabläufe."}, {"id": "care_minutes", "group": "Monatliche Betreuung", "label": "Änderungszeit pro Monat", "unit": "Minuten", "quantities": [15, 30, 60, 120, 240, 480, 720, 1200, 1800], "description": "Gemeinsames Zeitkontingent für monatliche Änderungsaufträge, keine automatische Übertragung."}, {"id": "care_requests", "group": "Monatliche Betreuung", "label": "Änderungsaufträge pro Monat", "unit": "Aufträge", "quantities": [1, 2, 3, 4, 6, 10, 14, 20, 30], "description": "Auftragsanzahl und enthaltene Minuten gelten gemeinsam."}, {"id": "care_systems", "group": "Monatliche Betreuung", "label": "Betreute Systeme", "unit": "Systeme", "quantities": [1, 1, 1, 2, 3, 4, 6, 8, 12], "description": "Vereinbarte Website-, Backend- oder Portalinstanzen."}, {"id": "care_checks", "group": "Monatliche Betreuung", "label": "Pflege- & Funktionschecks pro Monat", "unit": "Checks", "quantities": [1, 1, 1, 2, 2, 4, 4, 4, 4], "description": "Monitoring-Auswertung, Updates und vereinbarte Sicherungsprüfungen. Kein 24/7-SLA."}]}'::jsonb);
alter table public.nc_leads add column offer_snapshot jsonb;
alter table public.nc_projects add column offer_snapshot jsonb,add column included_change_rounds integer check(included_change_rounds between 0 and 999);
-- Only future projects get the new default. Existing agreements retain their rates.
alter table public.nc_projects alter column hourly_rate_cents set default 15000;
alter table public.nc_projects alter column package set default 'Basic';
alter table public.nc_subscriptions add column offer_snapshot jsonb,add column included_requests integer check(included_requests>=0);
alter table public.nc_time_entries add column change_round integer check(change_round between 1 and 999),add column extra_work text,add column approved_rate_cents integer check(approved_rate_cents>=0);
alter table public.nc_time_entries add constraint nc_change_round_documented check(change_round is null or change_request is not null),add constraint nc_extra_documented check(extra_work is null or (length(btrim(extra_work)) between 3 and 2000 and correction_round is null and change_request is null and change_round is null));
update public.nc_time_entries t set approved_rate_cents=p.hourly_rate_cents from public.nc_projects p where t.project_id=p.id and t.approved_at is not null;

create function public.nc_save_offer_catalog(p_user uuid,p_version integer,p_document jsonb) returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 update nc_offer_catalog set version=version+1,document=jsonb_set(p_document,'{version}',to_jsonb(version+1)),updated_at=now() where id=1 and version=p_version;
 if not found then raise exception 'Der Katalog wurde zwischenzeitlich geändert. Bitte neu laden.'; end if;
 insert into nc_audit(user_id,action,detail) values(p_user,'catalog.update',jsonb_build_object('previous_version',p_version,'version',p_version+1));
end $$;
create function public.nc_set_project_offer(p_user uuid,p_project uuid,p_quote jsonb,p_corrections integer,p_changes integer) returns void language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 if (p_quote->>'catalog_version')::integer is distinct from (select version from nc_offer_catalog where id=1 for share) then raise exception 'Katalog geändert. Bitte neu laden.'; end if;
 update nc_projects set offer_snapshot=p_quote,package=p_quote->>'package',budget_cents=(p_quote->>'one_time_cents')::bigint,hourly_rate_cents=(p_quote->>'extra_hourly_cents')::integer,included_correction_rounds=p_corrections,included_change_rounds=p_changes where id=p_project;
 if not found then raise exception 'Projekt fehlt.'; end if;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'project.offer',p_project,p_quote);
end $$;
create function public.nc_set_project_limits(p_user uuid,p_project uuid,p_corrections integer,p_changes integer,p_rate integer) returns void language plpgsql security invoker set search_path=public as $$
declare previous nc_projects;
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 select * into previous from nc_projects where id=p_project for update;
 if previous.id is null then raise exception 'Projekt fehlt.'; end if;
 update nc_projects set included_correction_rounds=p_corrections,included_change_rounds=p_changes,hourly_rate_cents=p_rate where id=p_project;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'project.limits',p_project,jsonb_build_object('previous_corrections',previous.included_correction_rounds,'previous_changes',previous.included_change_rounds,'previous_rate',previous.hourly_rate_cents,'corrections',p_corrections,'changes',p_changes,'rate',p_rate));
end $$;
drop function public.nc_timer(uuid,uuid,text,text,text,text,integer,text);
drop function public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text);
create function public.nc_timer(p_user uuid,p_project uuid,p_kind text,p_action text,p_category text default 'active',p_description text default '',p_correction_round integer default null,p_change_request text default null,p_change_round integer default null,p_extra_work text default null) returns uuid language plpgsql security invoker set search_path=public as $$
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
 insert into nc_time_entries(user_id,project_id,kind,category,description,correction_round,change_request,change_round,extra_work) values(p_user,p_project,p_kind,p_category,p_description,p_correction_round,p_change_request,p_change_round,p_extra_work) returning id into result;
elsif p_action='stop' then
 update nc_time_entries set stopped_at=now() where user_id=p_user and kind=p_kind and stopped_at is null returning id into result;
else raise exception 'Ungültige Aktion'; end if;
insert into nc_audit(user_id,action,entity_id) values(p_user,'timer.'||p_action,result);
return result;
end $$;

create function public.nc_manual_time(p_user uuid,p_project uuid,p_kind text,p_category text,p_description text,p_start timestamptz,p_stop timestamptz,p_correction_round integer default null,p_change_request text default null,p_change_round integer default null,p_extra_work text default null) returns uuid language plpgsql security invoker set search_path=public as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if p_start is null or p_stop is null or p_stop<=p_start or p_stop>now() or p_stop-p_start>interval '24 hours' then raise exception 'Bitte einen vergangenen Zeitraum von höchstens 24 Stunden angeben.'; end if;
 if p_kind not in ('internal','external') or p_category not in ('active','processing','waiting','break') or length(trim(p_description))<3 then raise exception 'Zeitart oder Leistungsbeschreibung fehlt.'; end if;
 if not exists(select 1 from nc_projects where id=p_project and status<>'Archiviert') then raise exception 'Projekt nicht verfügbar.'; end if;
 if exists(select 1 from nc_time_entries where user_id=p_user and kind=p_kind and started_at<p_stop and coalesce(stopped_at,'infinity'::timestamptz)>p_start) then raise exception 'Der Zeitraum überschneidet sich mit einer bereits erfassten Zeit derselben Zeitart.'; end if;
 insert into nc_time_entries(user_id,project_id,kind,category,description,started_at,stopped_at,correction_round,change_request,change_round,extra_work) values(p_user,p_project,p_kind,p_category,trim(p_description),p_start,p_stop,p_correction_round,p_change_request,p_change_round,p_extra_work) returning id into result;
 insert into nc_audit(user_id,action,entity_id) values(p_user,'time.manual',result);
 return result;
end $$;

create or replace function public.nc_approve_time(p_user uuid,p_entry uuid) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries; p nc_projects;
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 select * into t from nc_time_entries where id=p_entry for update;
 if t.id is null or t.kind<>'external' or t.stopped_at is null or t.category='break' then raise exception 'Nur abgeschlossene externe Leistungen freigeben.'; end if;
 if t.approved_at is not null then return; end if;
 select * into p from nc_projects where id=t.project_id for share;
 if t.correction_round is not null then
  if p.included_correction_rounds is null then raise exception 'Korrekturkontingent zuerst vereinbaren.'; end if;
  if t.correction_round<=p.included_correction_rounds then raise exception 'Diese Korrekturrunde ist bereits im Paket enthalten.'; end if;
 elsif t.change_request is not null then
  if p.included_change_rounds is null or t.change_round is null then raise exception 'Änderungskontingent und Änderungsnummer zuerst zuordnen.'; end if;
  if t.change_round<=p.included_change_rounds then raise exception 'Diese Abänderung ist bereits im Paket enthalten.'; end if;
 elsif t.extra_work is null and p.offer_snapshot is not null then
  raise exception 'Reguläre Arbeit ist im Projektpaket enthalten. Mehrumfang zuerst als Zusatzleistung dokumentieren.';
 end if;
 if p.hourly_rate_cents<=0 then raise exception 'Stundensatz zuerst vereinbaren.'; end if;
 if t.category in ('waiting','processing') and not p.waiting_billable then raise exception 'Warte-/Verarbeitungszeit ist im Projekt nicht als abrechenbar vereinbart.'; end if;
 if length(trim(t.description))<3 then raise exception 'Leistungsbeschreibung fehlt.'; end if;
 update nc_time_entries set approved_at=now(),approved_by=p_user,approved_rate_cents=p.hourly_rate_cents where id=p_entry;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'time.approve',p_entry,jsonb_build_object('hourly_rate_cents',p.hourly_rate_cents));
end $$;
drop function public.nc_assign_time_work(uuid,uuid,integer,text);
create function public.nc_assign_time_work(p_user uuid,p_entry uuid,p_round integer,p_change_request text default null,p_change_round integer default null,p_extra_work text default null) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries;
begin
 if not exists(select 1 from nc_users where id=p_user and role='global_admin' and active) then raise exception 'UNAUTHORIZED'; end if;
 select * into t from nc_time_entries where id=p_entry for update;
 if t.id is null then raise exception 'Zeit nicht gefunden.'; end if;
 if t.stopped_at is null or t.approved_at is not null or exists(select 1 from nc_invoice_times where time_id=p_entry) then raise exception 'Nur abgeschlossene, noch nicht freigegebene oder abgerechnete Zeiten können zugeordnet werden.'; end if;
 update nc_time_entries set correction_round=p_round,change_request=p_change_request,change_round=p_change_round,extra_work=p_extra_work where id=p_entry;
 insert into nc_audit(user_id,action,entity_id,detail) values(p_user,'time.assignment',p_entry,jsonb_build_object('previous_round',t.correction_round,'correction_round',p_round,'previous_change_request',t.change_request,'change_request',p_change_request,'previous_change_round',t.change_round,'change_round',p_change_round,'previous_extra_work',t.extra_work,'extra_work',p_extra_work));
end $$;
create or replace function public.nc_assign_correction(p_user uuid,p_entry uuid,p_round integer) returns void language plpgsql security invoker set search_path=public as $$
declare t nc_time_entries;
begin
 select * into t from nc_time_entries where id=p_entry for update;
 if t.change_request is not null or t.extra_work is not null then raise exception 'Abänderung/Zusatzleistung über die Leistungszuordnung bearbeiten.'; end if;
 perform public.nc_assign_time_work(p_user,p_entry,p_round,null,null,null);
end $$;
revoke all on function public.nc_save_offer_catalog(uuid,integer,jsonb),public.nc_set_project_offer(uuid,uuid,jsonb,integer,integer),public.nc_set_project_limits(uuid,uuid,integer,integer,integer),public.nc_timer(uuid,uuid,text,text,text,text,integer,text,integer,text),public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text,integer,text),public.nc_assign_time_work(uuid,uuid,integer,text,integer,text) from public,anon,authenticated;
grant execute on function public.nc_save_offer_catalog(uuid,integer,jsonb),public.nc_set_project_offer(uuid,uuid,jsonb,integer,integer),public.nc_set_project_limits(uuid,uuid,integer,integer,integer),public.nc_timer(uuid,uuid,text,text,text,text,integer,text,integer,text),public.nc_manual_time(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text,integer,text),public.nc_assign_time_work(uuid,uuid,integer,text,integer,text) to service_role;
notify pgrst, 'reload schema';
commit;
