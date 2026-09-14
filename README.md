# NEX Consulting

Website und interner CRM-Workspace mit Next.js, Vercel und Supabase.

Live-Vorschau: https://nex-consulting.vercel.app · Login: https://nex-consulting.vercel.app/login

Ausführungsregion Frankfurt. Website und geschützte Portal-Endpunkte werden nach dem Deployment geprüft.

Die aktuelle Nutzervorgabe lautet: **PUSH = vollständiger Stand nach GitHub auf `main`, Vercel Production aktualisieren und Supabase-Migrationen synchronisieren.** Ziel: `NexHolding/NEX-Consulting-Development`. Die frühere Nur-lokal-Vorgabe ist aufgehoben. Dauerhafte Arbeitsanweisungen stehen in `AGENTS.md`. Zugangsdaten und Datenbankinhalte bleiben außerhalb von Git.

## Einrichtung

Node 24, `npm ci`, `.env.example` nach `.env.local` übertragen und serverseitige Werte ergänzen. Anschließend `npm run dev` oder `npm run build` und `npm start`.

Alle CRM-Daten liegen im separaten Supabase-Projekt `yeaihagzvzirmnrvvbng` in Frankfurt. Migrationen unter `supabase/migrations` sind angewendet. Das Vercel-Projekt heißt `nex-consulting` im Team `nex-holding`.

## Verfügbar

- Bearbeitbare Website-Texte und Pakete in `src/lib/content.ts`, weitere Seiteninhalte in `src/components/landing.tsx`.
- Geschützter Login unter `/login`; `Global_Admin` ist eingerichtet. Das Passwort wird ausschließlich als gesalzener scrypt-Hash gespeichert.
- Kunden und Ansprechpartner, Projekte mit Status und Budget, Aufgaben, Website-Anfragen.
- Unabhängige interne und externe Timer mit serverseitigen Zeitstempeln und Schutz gegen konkurrierende Starts.
- Externe Freigaben; Warte-/Verarbeitungszeit nur bei ausdrücklich gesetzter Projektvereinbarung.
- Betreuungsverträge und idempotente monatliche Rechnungsentwürfe, täglich über Vercel Cron.
- Manuelle Projekt-Rechnungsentwürfe und geschützte druckbare Detailansicht.

## Noch nicht produktiv freigeschaltet

- E-Mail-Rechnungsversand, steuerliche Finalisierung, Belegnummern, Zahlungen und Mahnungen. Benötigt Betreiber-/Steuerangaben und bestätigten Absender/Versandanbieter.
- Automatische Fakturierung freigegebener Zeitpositionen und automatische Verrechnung der Betreuungskontingente. Bis dahin Freigaben als Nachweis, Rechnungspositionen manuell prüfen.
- Erweiterte Teamrechte im Haupt-CRM. Mitarbeiter können die Portalverwaltung bearbeiten; das Haupt-CRM bleibt Global Admin vorbehalten.
- Domain `www.next-consulting.com`, öffentliche Rechtstexte, abschließende Portfolio-Freigaben. Die Website ist derzeit ausdrücklich eine nicht indexierbare Vorschau.

Das Briefing beschreibt den weitergehenden Zielumfang. Diese Anwendung ist die erste funktionsfähige Version, nicht bereits die vollständige Umsetzung aller Erweiterungen.

## Verifikation

- `npm test`: Passwort- und Sitzungstests.
- `TEST_ADMIN_PASSWORD=... node --env-file=.env.local tests/integration.mjs`: Authentifizierung, Origin-Prüfung, persistente Timer, Startkonkurrenz, Freigabegrenzen, Betreuungsverträge, wiederholte Abrechnung, Aufgaben, Kontaktformular und Logout. Nur gegen eine gezielt freigegebene Testumgebung starten; erzeugt synthetische Datensätze und räumt diese anschließend auf.
- `npm run build`: Produktion und TypeScript.

Kein Secret ins Repository, in Logs oder ins Client-Bundle übernehmen. Datenbankpasswort und Service-Role-Key sind ausschließlich lokal geschützt bzw. als verschlüsselte Vercel-Konfiguration gespeichert. Alle CRM-Tabellen haben RLS ohne öffentliche Zugriffsregeln; die Anwendung greift nach serverseitiger Berechtigungsprüfung zu.

## Kundenportal und interne Portalverwaltung

- `/portal`: ausschließlich Dashboard, freigegebene Aufträge mit Detailansicht, Supporttickets, Tarif, Rechnungen, Verträge/Dokumente und Kontaktdaten. Authentifizierte Daten werden ohne Cache und mit expliziten Feldlisten abgefragt.
- `/crm/portal`: Aufträge, Websites/Anwendungen, Mehrfachzuordnung von Websites zu Aufträgen, nachträgliche Ticketzuordnung, interne Kommentare, freigegebene Antworten und Dokumente. Neue Inhalte sind standardmäßig intern.
- Kundenzugänge und Mitarbeiterzugänge legt der Global Admin unter Kundenzugänge an. Kundenkonten sind fest einem Kunden zugeordnet. Mitarbeiter dürfen Portalverwaltung nutzen, aber keine Konten erstellen und nicht auf das Haupt-CRM zugreifen.
- Websiteauswahl und Zuordnungen sind auf den jeweiligen Kunden begrenzt. Der Kunde muss beim Ticket keine Website auswählen. Mitarbeiter bestätigen Vorschläge durch Auswahl und Speichern; keine automatische Zuweisung.
- Private PDF-Dateien (maximal 4 MB) werden in `nc-documents` gespeichert. Jeder Download prüft Sitzung, Kundenzuordnung und Freigabe erneut. Ein Upload allein veröffentlicht keine Datei.
- Rechnungsentwürfe bleiben gesperrt. Bestehende steuerliche Finalisierung und Rechnungsversand sind weiterhin nicht aktiviert.

### Website-Vorschläge

Ohne zusätzliche Konfiguration arbeitet ein lokaler, im Adminportal als solcher gekennzeichneter Abgleich von Domains, Website-Namen und Funktionen. Für semantische KI-Vorschläge serverseitig `OPENAI_API_KEY` und `TICKET_AI_MODEL` setzen. Die Integration verwendet die [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) mit strukturierten Ausgaben, `store: false`, acht Sekunden Timeout und Prüfung aller vorgeschlagenen IDs gegen die Websites des Kunden. Übertragen werden Tickettext und die Namen, Domains und Funktionsbeschreibungen dieses Kunden; interne Kommentare oder Zugänge werden nicht übertragen. Ohne Konfiguration, bei Ausfall oder ungültiger Ausgabe greift der lokale Abgleich. Der Live-Aufruf eines KI-Modells ist ohne Schlüssel noch nicht verifiziert.

### Portaltests

`node --env-file=.env.local tests/portal-integration.mjs` prüft Rollen, Kundentrennung, Freigaben, PDF-Zugriff, Ticketannahme und Zuordnungen mit synthetischen Datensätzen. `BROWSER_QA=1` ergänzt Headless-Browsertests für Login, Auftragsdetails, Ticketformular und mobile Darstellung. Alle Testkonten, Daten und Dateien werden im selben Lauf im finally-Block bereinigt.

### Kundenakte und Leistungsnachweise

Im CRM öffnet der Kundenname die Kundenakte. Hauptnavigation und kontextbezogene
zweite Navigation trennen Kunden, Interessenten, Projektarbeit und Finanzen.
Die Kundenakte bietet Stammdaten, abweichende Rechnungsdaten, Herkunft/Webseite,
Projekte, Zeitstand und Belege. Direkte Kundenlinks bleiben nach Neuladen erhalten.

Unter **Projekte → Zeiterfassung → Zeit nachtragen** lassen sich abgeschlossene
Leistungen mit Beginn, Ende, Zeitart und Beschreibung erfassen. Nachträge dürfen
höchstens 24 Stunden umfassen, nicht in der Zukunft liegen und keine Zeiten
desselben Mitarbeiters und derselben Zeitart überschneiden. Externe Leistungen
benötigen weiterhin eine separate Abrechnungsfreigabe.

**Zeiten & Auszüge** erstellt geschützte PDF-Downloads für den Gesamtstand oder
einen ausgewählten Monat, optional nach Projekt gefiltert. Monatsgrenzen werden
in Europe/Berlin berechnet; übergreifende Zeiten werden anteilig berücksichtigt.
Interne und externe Zeiten sind unabhängige Größen, keine gemeinsame Summe.

Datenbankerweiterung: `20260914120000_customer_profiles_time.sql`.
Rechnungsversand und der automatische Buchhaltungsimport weiterer Webseiten
sind weiterhin separate Ausbaustufen. Herkunftsangaben allein stellen keine
Systemverbindung her.

Prüfungen: `npm test`, `npm run build`. Für die isolierte Integration stehen
`tests/customer-workspace-integration.mjs`, `TEST_BASE_URL` und
`TEST_SESSION_FILE` (temporäre Admin-Testsitzung) bereit. Der Test benötigt die
serverseitigen Supabase-Variablen und entfernt seine eigenen QA-Datensätze.
