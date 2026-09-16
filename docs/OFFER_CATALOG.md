# Angebotskonfigurator

Der Leistungskatalog lässt sich im CRM unter **Einstellungen → Leistungskatalog** pflegen. Die initialen 28 Leistungen stehen in `src/lib/default-offer-catalog.json`. Der produktive Katalog wird anschließend in `nc_offer_catalog` gespeichert. Neue Leistungen, Mengen, Beschreibungen, Gruppen, Einheiten, innere Budgetstufen und monatliche Preise können ohne Codeänderung gepflegt werden.

## Preislogik

| Projektbudget netto | Betreuung netto / Monat |
| --- | --- |
| 1.000 € | 49 € |
| 3.000 € | 99 € |
| 5.000 € | 149 € |
| 10.000 € | 299 € |
| 20.000 € | 599 € |
| 35.000 € | 1.199 € |
| 50.000 € | 1.999 € |
| 75.000 € | 3.499 € |
| 100.000 € | 5.000 € |

Basic: unter 10.000 €. Business: 10.000 bis unter 35.000 €. Enterprise: ab 35.000 €. Zwischen Stufen wird linear interpoliert. Mengen werden abgerundet, monatliche Preise auf volle Euro gerundet. Basic enthält grundsätzlich keine Komplettänderungen, auch nach Katalogänderungen. Größere Pakete enthalten Änderungen abhängig von der ausgewiesenen Menge.

Logo optional: 299 € netto einmalig, Korrekturen innerhalb des Projektkontingents. Domain-Verwaltung optional: 2–5 € netto pro Domain und Monat. Domains werden zusätzlich zur Betreuung berechnet; daher kann die Gesamtsumme monatlich über 5.000 € liegen. Fremdanbieter-, Hosting-, Lizenz- und Verbrauchskosten sind separat. Die Konfiguration ist eine unverbindliche Kalkulation, der konkrete Umfang wird vor Beauftragung abgestimmt.

## Anfrage und Vereinbarung

Der Browser sendet nur die Auswahl und die Katalogversion. Der Server berechnet Preise und Mengen erneut und speichert die vollständige Momentaufnahme an der Anfrage. Veraltete Katalogversionen werden abgewiesen. Katalogänderungen überschreiben keine früheren Anfragen, Projektvereinbarungen oder Betreuungsverträge.

Im Projekt kann der Admin einen bestätigten Umfang übernehmen. Er setzt Projektpreis, Paket, Korrektur-/Änderungskontingente und den Satz von 150 € netto/Stunde. Individuelle Kontingente und Stundensätze können danach separat vereinbart werden; sie haben für die Zeiterfassung Vorrang. Neue Betreuungsverträge übernehmen Preis inklusive Domains, Minuten und Auftragsanzahl aus dem vereinbarten Projektumfang. Bereits bestehende Verträge werden nicht geändert.

## Zeiten und Mehrumfang

- Korrekturrunde: Rundennummer; mehrere Zeitabschnitte derselben Runde zählen einmal.
- Abänderung: eigene Änderungsnummer und Beschreibung des Kundenwunsches; kein Verbrauch des Korrekturkontingents.
- Zusatzleistung: dokumentierter Mehrumfang, beispielsweise zusätzliche Seiten oder Schnittstellen.
- Unbekannte Kontingente oder alte, nicht nummerierte Änderungen bleiben offen.
- Enthaltene Leistungen und reguläre Arbeit eines vereinbarten Pakets können nicht nochmals als Einzelzeit freigegeben werden.
- Zusätzliche abgeschlossene externe Zeiten können freigegeben werden. Interne Zeiten, Pausen und nicht vereinbarte Wartezeiten bleiben ausgeschlossen.
- Freigabe speichert den geltenden Stundensatz an der Zeit. Spätere Satzänderungen verändern freigegebene Beträge nicht.
- Zeitübersicht und PDF zeigen einen vorläufigen Nettobetrag anhand tatsächlicher Dauer (sekundengenau, pro Eintrag auf Cent gerundet). Kein automatischer Rechnungsversand.
- Die Monatsbetreuung weist ihre vereinbarten Minuten und Auftragskontingente aus. Zusätzliche Betreuungsarbeit wird bewusst als Zusatzleistung dokumentiert; Kontingentüberschreitungen werden nicht aus freiem Beschreibungstext abgeleitet.

## Veröffentlichung

Migration `20260916180000_offer_catalog_scope.sql` vor oder zusammen mit dem Anwendungscode ausrollen. Sie bewahrt bestehende Kundenvereinbarungen und setzt den neuen Standardstundensatz nur für neue Projekte. Ohne Migration meldet der Konfigurator einen fehlenden Katalog und nimmt keine Konfigurationsanfrage entgegen. Keine Kundendaten in Seed-Dateien.
