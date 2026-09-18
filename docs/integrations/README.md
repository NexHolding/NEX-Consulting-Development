# Zentrale Buchhaltung der NEX Consulting KG

Eine Gesellschaft, mehrere Marken/Kostenstellen. Einstieg: `/crm/finance`. NEX Allgemein enthält eigene Belege; Gesamtfirma aggregiert die Marken. Importe bleiben mit Quelle, stabiler Quell-ID und Version nachvollziehbar. Fehlende oder nicht aktuelle Quellen werden ausdrücklich angezeigt, nicht als bestätigter Nullbestand bewertet.

## Fachlicher Umfang

- Belege und geschützte Originaldateien, Lieferscheinarchiv, Kontierung, Festschreibung und datierte Stornogegenbuchung mit Grund.
- Bankumsätze manuell oder CSV importieren, Teilbeträge zu offenen Rechnungen zuordnen. Keine automatische Bankanbindung und keine Überweisungsausführung. Zahlungsfreigaben und CSV sind eine Vorbereitung zur manuellen Prüfung/Übernahme in der Bank.
- Anlagenregister und lineare monatliche AfA. Nutzungsdauer/Konten werden manuell fachlich festgelegt. Anschaffungsbelege als Anlagevermögen klassifizieren; Anlage und AfA nicht doppelt als Aufwand buchen.
- Lohnunterlagen und Monats-Kontrollwerte. Keine Lohnsteuer-/Sozialversicherungsberechnung. Nur gebuchte Aufwandsbelege fließen als Lohnkosten ins Ergebnis ein; Kontrollwerte werden nicht zusätzlich addiert.
- Markenvergleich, interne Allgemeinkosten-Umlage (zunächst aus, alternativ nach Umsatz oder festen Prozenten), Journal und PDF/CSV. Umlagen verändern niemals das Gesamtergebnis. Globale Umlagekonfiguration wirkt auf den gewählten Auswertungszeitraum; sie ist eine Controlling-Sicht, kein festgeschriebener Verteilungslauf.
- Abschlussvorbereitung auf Basis gebuchter Nettobeträge. Kein festgestellter Jahresabschluss, keine Bilanz-/Steuererklärung oder amtliche Meldung. Fachliche Abschlussbuchungen, Eröffnungsbestände und Kontenabstimmung bleiben separat zu ergänzen.

## Verbindung einer Marke

1. Im NEX-CRM unter **Finanzen → Verwaltung** für die Marke einen eigenen Schlüssel erzeugen. Er wird einmal angezeigt. NEX speichert nur Hash + mit dem vorhandenen `NC_CREDENTIALS_KEY` verschlüsselten Wert.
2. Im Quellprojekt ausschließlich diesen neuen Schlüssel als serverseitiges `NEX_ACCOUNTING_TOKEN` hinterlegen. Keine bestehenden Supabase-Schlüssel austauschen oder exportieren.
3. Die Quelle implementiert `GET /api/integrations/nex-accounting/export` und optional `GET /api/integrations/nex-accounting/file?id=<Quellbeleg-ID>`. Beide prüfen den dedizierten Bearer-Schlüssel. Unkonfiguriert antworten sie 401; kein Fallback auf Admin-/Datenbankschlüssel.
4. In NEX **Jetzt abgleichen** ausführen. Erst eine erfolgreiche vollständige Momentaufnahme setzt die Quelle auf „Abgeglichen“. Täglicher Abgleich um 05:45 UTC für eingerichtete Quellen; `CRON_SECRET` schützt den Cron-Endpunkt.
5. Belege, AfA und Summen mit der Quelle abstimmen. Fremdwährungen werden abgelehnt, nicht still konvertiert. Fehlende Buchhaltungen (derzeit Finanzhelden, Goldhelden, Posthelden) bleiben vorbereitet.

Fest freigegebene Pull-Adressen: Insolvenzhelden `insolvenzhelden-six.vercel.app`, Finanzhelden `finanz-helden.vercel.app`, Goldhelden `gold-helden.vercel.app`. Für Posthelden ist Push vorbereitet, bis eine konkrete Adresse festgelegt wird. Andere Ziele benötigen eine bewusste Allowlist-Erweiterung in `src/lib/finance/server.ts`.

### Insolvenzhelden-Adapter

Die Vorlagen in `insolvenzhelden/` entsprechen der vorhandenen `ih_accounting_*`-Struktur. Installation:

- `mapper.mjs` → `src/lib/accounting/nex-export.mjs`
- `export-route.ts.txt` → `src/app/api/integrations/nex-accounting/export/route.ts`
- `file-route.ts.txt` → `src/app/api/integrations/nex-accounting/file/route.ts`

Die Quelle verwendet ihre vorhandene interne Server-Datenbankverbindung. Exportiert werden die Insolvenzhelden-Belege/Anlagen der Gesellschaft `next_consulting_kg`, gebuchte/geplante AfA, aktuelle reguläre Lohnvorbereitungen (nur Personalreferenz und Beträge) und Bankbewegungen. Entwürfe bleiben Entwürfe, Vorschaulöhne und überholte Versionen werden nicht aggregiert. Andere Marken-Belege in derselben Quelldatenbank sind nicht Bestandteil dieses markenspezifischen Feeds. Bankumsätze sind ergebnisneutral.

Der Adapter ist read-only. Keine Änderung an bestehenden Buchhaltungsdaten oder Supabase-Zugangsdaten. Originaldateien werden nur nach Prüfung der Gesellschaft/Marke über 60 Sekunden gültige signierte Download-Links freigegeben. Eine erzeugte Verbindung ersetzt nicht die fachliche Kontrolle, ob alle Erlöse im Quell-Belegbestand erfasst sind.

## Vertrag v1 für weitere Marken

Schema: `src/lib/finance/schema.ts` (`financeImportSchema`, `financeDataSchema`). Beträge sind ganze **Eurocent**; Datum `YYYY-MM-DD`; `generated_at` ISO UTC. Pflichtbeispiel, ausschließlich synthetisch:

```json
{
  "schema_version": 1,
  "source": "finanzhelden",
  "batch_id": "unique-batch-2026-09-18-001",
  "mode": "snapshot",
  "generated_at": "2026-09-18T10:00:00.000Z",
  "records": [
    {
      "external_id": "stable-source-document-id",
      "revision": "source-content-revision-1",
      "brand": "finanzhelden",
      "kind": "document",
      "state": "posted",
      "data": {
        "title": "Synthetische Ausgangsrechnung",
        "date": "2026-09-18",
        "document_kind": "outgoing_invoice",
        "net": 10000,
        "tax": 1900,
        "gross": 11900,
        "currency": "EUR",
        "debit": "1200",
        "credit": "4400",
        "tax_account": "3806",
        "recognition": "operating",
        "cost_center": "direkt"
      }
    }
  ]
}
```

- `source + kind + external_id` ist dauerhaft eindeutig. Änderungen benötigen eine neue `revision`; gleiche Version mit abweichenden Daten wird abgelehnt. Identische Batch-Wiederholung ist idempotent. Alte `generated_at` werden abgelehnt.
- `snapshot` muss den vollständigen aktuellen Bestand dieser Quelle enthalten. Fehlende Einträge bleiben erhalten, werden als fehlend markiert und aus dem aktuellen Quellergebnis ausgeschlossen. Warnung im Dashboard/Export beachten. Keine stille Löschung.
- `delta` enthält nur Änderungen und setzt den Status auf **Teilbestand**. Nicht als vollständigen Gesamtabschluss verwenden. Änderungen unterliegen Periodensperren; keine stillen Umschreibungen geschlossener Monate.
- Pro Anfrage höchstens **500 Datensätze / 2,5 MB**. Zu große Quellbestände werden ausdrücklich abgelehnt, niemals abgeschnitten. Vor Überschreitung muss ein versionierter paginierter Vollabgleich ergänzt werden. Nicht mehrere unvollständige Teile als `snapshot` schicken.
- Optional `attachment: {name, remote_id, mime, size}`. Der Datei-Endpunkt liefert `{ "url": "<kurzlebiger signierter Supabase-Download>" }`; nur HTTPS unter `*.supabase.co/storage/v1/object/sign/` ist zugelassen.
- Alternativ Push: `POST https://nex-consulting.vercel.app/api/finance/import?source=<markencode>`, JSON und `Authorization: Bearer <markeneigener Schlüssel>`. Die `source` muss zum authentifizierten Schlüssel passen. Keine Browser-Clients oder öffentlichen Tokens.
- Quellbelege/Bankumsätze nicht zusätzlich manuell in NEX nachbuchen. Die zentrale Kostenstellen-Zuordnung ist getrennt vom unveränderlichen Quellinhalt und bleibt bei Folgeimporten erhalten.

## Prüfungen

NEX: Unit-Tests für Kontierung, Cent-Verteilung, AfA, Geldbeträge, Schema und Exportadapter; isolierte PostgreSQL-Tests für Festschreibung, Versionen, Teilzahlungen, Stornos, Periodensperren, Importwiederholung und RLS. Browserprüfung der neun Ansichten bei 360/390/768/1440 px mit ausschließlich synthetischen Daten. Bestehende CRM-Daten werden durch die additive Migration nicht geändert.
