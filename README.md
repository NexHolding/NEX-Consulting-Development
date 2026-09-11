# Next Consulting

Website und interner CRM-Workspace mit Next.js, Vercel und Supabase.

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
- Zusätzliche Teamrollen und Kundenportal: Schema-Rollen sind vorgesehen, aktuell kann ausschließlich Global_Admin das interne CRM verwenden.
- Domain `www.next-consulting.com`, öffentliche Rechtstexte, abschließende Portfolio-Freigaben. Die Website ist derzeit ausdrücklich eine nicht indexierbare Vorschau.

Das Briefing beschreibt den weitergehenden Zielumfang. Diese Anwendung ist die erste funktionsfähige Version, nicht bereits die vollständige Umsetzung aller Erweiterungen.

## Verifikation

- `npm test`: Passwort- und Sitzungstests.
- `TEST_ADMIN_PASSWORD=... node --env-file=.env.local tests/integration.mjs`: Authentifizierung, Origin-Prüfung, persistente Timer, Startkonkurrenz, Freigabegrenzen, Betreuungsverträge, wiederholte Abrechnung, Aufgaben, Kontaktformular und Logout. Nur gegen eine gezielt freigegebene Testumgebung starten; erzeugt synthetische Datensätze und räumt diese anschließend auf.
- `npm run build`: Produktion und TypeScript.

Kein Secret ins Repository, in Logs oder ins Client-Bundle übernehmen. Datenbankpasswort und Service-Role-Key sind ausschließlich lokal geschützt bzw. als verschlüsselte Vercel-Konfiguration gespeichert. Alle CRM-Tabellen haben RLS ohne öffentliche Zugriffsregeln; die Anwendung greift nach serverseitiger Berechtigungsprüfung zu.
