# Zeiteinträge nachträglich korrigieren

In **Zeiterfassung** und im Kundenprofil unter **Zeiten & Auszüge** öffnet „Eintrag bearbeiten“ die Korrekturmaske. Beginn, Ende, Projekt, interne/externe Zeitart, Kategorie, Beschreibung und Leistungszuordnung können geändert werden. Alle Uhrzeiten beziehen sich auf Europe/Berlin; unveränderte Zeitstempel behalten ihre ursprüngliche Genauigkeit.

Ein Endzeitpunkt ist erforderlich. Damit können auch versehentlich weiterlaufende Timer rückwirkend beendet werden. Der korrigierte Zeitraum muss in der Vergangenheit liegen, positiv und höchstens 24 Stunden lang sein. Überschneidungen mit Zeiten desselben Mitarbeiters und derselben Zeitart werden abgelehnt; interne und externe Zeit dürfen sich überlagern.

Änderungsgrund, Bearbeiter sowie vorheriger und neuer Datensatz werden atomar in `nc_audit` unter `time.edit` protokolliert. Die ursprüngliche Mitarbeiterzuordnung bleibt erhalten. Eine Abrechnungsfreigabe samt gespeichertem Stundensatz wird bei einer Korrektur zurückgenommen; eine erneute Freigabe ist erforderlich. Einträge, die über `nc_invoice_times` einer Rechnung zugeordnet sind, bleiben gesperrt.

Jede Änderung an einem Zeiteintrag erhöht dessen `version`, auch Timer-Stopp, Freigabe oder Leistungszuordnung. Bei einer veralteten Bearbeitungsmaske wird das Speichern abgelehnt: schließen, Ansicht aktualisieren und erneut öffnen. Die laufende Hintergrundaktualisierung überschreibt keine offenen Eingaben.

## Prüfung

- `npm test`: Berliner Sommer-/Winterzeit, Zeitumstellung, unveränderte Präzision und Eingabegrenzen.
- `NODE_PATH=/pfad/zum/temporären/node_modules node tests/time-edit-db.cjs`: benötigt separat installiertes `pg` und die ignorierte `.env.supabase.local` samt Supabase-Verknüpfung. Der Test erstellt ausschließlich temporäre Tabellen und Funktionen, prüft Korrektur, Protokoll, Versionskonflikte, Freigaberücknahme, Überschneidungen, Rechnungssperre und Berechtigungen und führt abschließend ein Rollback aus.
- Migration: `20260918120000_edit_time_entries.sql`, keine Änderung vorhandener Zeitwerte.
