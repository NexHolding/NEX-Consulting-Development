# Kundenzugänge & Infrastruktur

Der interne Bereich ist ausschließlich für aktive `global_admin`-Konten verfügbar, entsprechend dem bestehenden CRM-Rechtemodell. Kundenportal und dessen Mitarbeiteransichten erhalten keine Zugangsdaten. Die Tabellen sind nicht im allgemeinen CRM-Snapshot enthalten. Direkter Datenbankzugriff durch `anon` und `authenticated` ist gesperrt; RLS ist aktiv.

## Einrichtung / Deployment

- Migration `20260915160000_customer_access_vault.sql` anwenden.
- `NC_CREDENTIALS_KEY` muss serverseitig eine Base64-kodierte, zufällige 32-Byte-Zeichenfolge enthalten. Der lokale Schlüssel liegt ausschließlich in der ignorierten `.env.local`.
- Beim nächsten PUSH diesen bestehenden Schlüssel über einen geheimen stdin-/Dateikanal als **sensitive** Vercel-Production-Variable setzen, falls dort noch kein Schlüssel besteht. Niemals Schlüsselwerte in Ausgaben, Git, URLs oder öffentliche Variablen übernehmen. Existiert ein Production-Schlüssel, diesen zuerst beibehalten und Zuordnung prüfen; nicht blind überschreiben.
- Ein Produktionsschlüssel muss vor dem ersten Speichern verfügbar sein. Ohne gültigen Schlüssel verweigert die API Speichern und Entschlüsseln. Infrastruktur ohne Passwörter kann separat gepflegt werden.
- Schlüssel sicher getrennt vom Datenbankbackup aufbewahren. Ohne passenden Schlüssel sind vorhandene Geheimnisse nicht wiederherstellbar. Ein Schlüsselwechsel erfordert vorheriges kontrolliertes Neuverschlüsseln der vorhandenen Datensätze; bloßes Ersetzen der Variable ist keine Rotation.

## Speicherung und Anzeige

Passwörter werden mit AES-256-GCM, zufälligem 96-Bit-Nonce und 128-Bit-Authentifizierungstag verschlüsselt. AAD bindet sie an Kunden-ID und Zugangs-ID. Normale Listenabfragen enthalten weder Klartext noch Chiffrat. Benutzername, Dienst und Freigabehinweise sind Verwaltungsmetadaten; Geheimnisse gehören in das Passwortfeld.

Die API entschlüsselt nur nach einer aktiven Administratorprüfung und einem gleichursprünglichen POST mit explizitem Zweck `view` oder `copy`. Antworten sind `private, no-store`; Abrufe sind begrenzt. Audit-Einträge enthalten nur Benutzer, Kunden-/Zugangs-ID und Aktion, niemals Passwörter. Schreiboperationen und zugehörige Audits erfolgen atomar über `nc_write_credential`.

Anzeige verdeckt sich nach 30 Sekunden, beim Verlassen des Tabs oder Fensterfokusverlust. Kopieren ruft das Passwort separat ab und rendert es nicht im DOM. Die Zwischenablage wird nach dem Kopieren nicht automatisch überschrieben. Beim Bearbeiten bleibt ein leeres Passwortfeld unverändert; die Anlage benötigt Benutzername und Passwort. Domains dürfen nur mit Zugängen desselben Kunden verknüpft werden (zusammengesetzter Fremdschlüssel).
