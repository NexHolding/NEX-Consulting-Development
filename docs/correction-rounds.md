# Korrekturrunden

Migration: `20260915200000_correction_rounds.sql` (beim nächsten PUSH anwenden).

Pro Projekt: `included_correction_rounds`, leer = nicht vereinbart, 0 = keine inklusive. Pro Zeiteintrag: `correction_round`, leer = reguläre Projektarbeit, sonst Rundennummer 1–999. Mehrere Zeiteinträge derselben Runde zählen einmal. Runde 1 bis zur Paketanzahl ist enthalten; höhere Nummern sind Zusatzzeit. Nummern werden bewusst vergeben, nicht aus Beschreibungen oder Tagen abgeleitet. Bestehende Zeiten und Projekte bleiben unverändert und zunächst ohne Zuordnung.

Zuordnung beim Timerstart, manuellen Nachtrag oder nachträglich an abgeschlossenen ungeprüften Zeiten. Laufende, freigegebene und bereits fakturierte Zeiten können nicht umgebucht werden. Änderungen werden protokolliert. Bei Änderungen des Paketumfangs wird die Darstellung der bestehenden Runden neu eingeordnet; PDFs zeigen den Stand zum Exportzeitpunkt.

Zusatzzeit bedeutet nur Vormerkung zur Abrechnungsprüfung. Korrekturrunden werden noch nicht automatisch berechnet und können bis zur späteren Festlegung der Abrechnungsformalitäten nicht zur Abrechnung freigegeben werden. Interne und externe Zeiten bleiben getrennt; die Korrekturzeit ist eine Teilmenge der Gesamtzeit, keine zusätzliche Summe.

## Abänderungen durch Kunden

Migration `20260915213000_customer_scope_changes.sql` ergänzt `change_request` am Zeiteintrag. NULL = keine Abänderung; andernfalls enthält das Feld den dokumentierten Kundenwunsch und die Abweichung vom vereinbarten Umfang. Die Dokumentation ist bei Auswahl von Abänderung erforderlich (3–2000 Zeichen). Ein Eintrag kann nicht zugleich Korrekturrunde und Abänderung sein; dies sichern API und Datenbank ab. Die Kategorie „Abänderung“ gehört weder zur Paketarbeit noch zum Kontingent der Korrekturrunden. Eigener Button in der Leistungszuordnung, separate Summen und Dokumentation in UI/PDF. Die externe Zeit bleibt für die gesonderte Abrechnung vorgemerkt; die bestehenden offenen Abrechnungsformalitäten werden nicht automatisch festgelegt.

Nachträgliche Zuordnung erfolgt mit Audit der alten/neuen Dokumentation. Freigegebene, fakturierte oder laufende Einträge sind gesperrt. Der alte Korrekturrunden-Endpunkt kann eine vorhandene Abänderungsdokumentation nicht überschreiben.
