# Next Consulting – Auftrag für Codex

Stand: 11. September 2026. Dieses Dokument ist ein vollständiger Umsetzungsauftrag mit Angebotsstruktur und ersten Website-Texten. Preise sind unsere vorgeschlagene Positionierung, noch keine beschlossenen Vertragsbedingungen. Umsetzungsstand nach Einrichtung: Eine erste Anwendung ist unter https://nex-consulting.vercel.app veröffentlicht; Global_Admin ist angelegt und der Login geprüft. Der vollständige Zielumfang dieses Briefings geht über die erste Version hinaus. Details zu aktiven Funktionen und noch offenen Erweiterungen stehen in README.md.

## 1. Ziel und Marke

Erstelle eine deutschsprachige Website mit geschütztem Agentur-CRM für **Next Consulting** unter **https://www.next-consulting.com**. Verwende diese .com-Adresse konsistent für Links, Metadaten und spätere Domainkonfiguration. Die Domain muss vor Aktivierung auf Eigentum und DNS-Zugang geprüft werden. Technische Bestandsnamen mit „NEX“ dürfen zunächst bestehen bleiben.

Wir entwickeln individuelle Websites, automatisierte Geschäftsprozesse, KI-Funktionen, CRM-Systeme und Buchungslösungen für Dienstleister und mittelständische Unternehmen. Die Website soll qualifizierte Projektanfragen erzeugen und anhand eigener Projekte und Kundenprojekte unsere Arbeit zeigen. Das CRM organisiert unsere eigenen Kunden, Projekte, Betreuungspakete, Arbeitszeiten und Rechnungen.

Wichtig: Das Agentur-CRM von Next Consulting ist unser internes Betriebssystem. Ein CRM, das wir im Business-Angebot für einen Kunden entwickeln, ist ein separates Kundenprojekt mit getrennten Daten und Zugängen.

## 2. Vorhandene Projekte und Referenzcode

Aktueller Arbeitsordner: `/Users/neveexperiences/Desktop/NEX Consulting ` (mit abschließendem Leerzeichen). Dieser Ordner war beim Prüfen leer.

Zusätzlich gefunden: `/Users/neveexperiences/Desktop/NEX Consulting/NEX Consulting Development`. Dort liegen bisher ein Starter-README, ein package.json ohne Anwendung und Einrichtungsskripte. Vor Implementierung einen eindeutigen Arbeitsordner festlegen; keine parallelen Anwendungen in beiden Ordnern pflegen und keine bestehenden Dateien überschreiben.

- GitHub: `NexHolding/NEX-Consulting-Development`.
- Vercel-Team: `nex-holding`, ID `team_o4qya35KVUd0352cWWaeiNnr`.
- Angelegtes Vercel-Projekt: `nex-consulting`, ID `prj_U0kB9Dwcmn8KBtLpbp74dNj0jWNp`.
- Supabase: Konto NexHolding verbunden; separates Projekt `next-consulting`, ID `yeaihagzvzirmnrvvbng`, Region Frankfurt (`eu-central-1`), erstellt und lokal verknüpft am 11.09.2026. CRM-Schema, Auth-Benutzer und Vercel-Laufzeitvariablen noch einzurichten.
- Insolvenzhelden-Development: `/Users/neveexperiences/Documents/02 Development/Insolvenzhelden`.
- Aurelia-Flow-Development: `/Users/neveexperiences/Desktop/Aurelia flow development`.

Die genannte Web-Referenz wurde als `https://insolvenzhelden-6.vercel.app` interpretiert, konnte aber nicht geladen werden. Die Designableitung basiert deshalb auf dem vorhandenen lokalen Code; die genaue Referenzadresse ist noch zu bestätigen.

Diese tatsächlich geprüften Insolvenzhelden-Dateien als strukturelle Vorlage lesen:

- `AGENTS.md`: Architektur und Designprinzipien.
- `src/app/globals.css`: Goldfarben, Flächen, Typografie, Panelgestaltung.
- `src/components/auth/role-login-form.tsx`: Kunden- und Mitarbeiter-Login mit serverseitiger Prüfung.
- `src/components/admin/admin-shell.tsx`: Hauptnavigation, Suche und Rollenfilter.
- `src/components/admin/customer-profile-secondary-navigation.tsx`: Kundenakte mit eigener Unternavigation.
- `src/lib/admin-center/customer-profile-navigation.ts`: Detailstruktur der Kundenakte.
- `src/lib/auth/`: vorhandene Authentifizierungs- und Berechtigungsmuster prüfen.
- `src/components/admin/customer-invoices.tsx`, `src/lib/admin-center/customer-invoice-repository.ts`, `src/lib/invoices/types.ts`: Rechnungsansichten und Zustände.
- `supabase/migrations/20260804160000_expand_admin_center.sql`: Zuständigkeiten, Verträge und Aufgaben.

Gestaltungs- und Navigationsprinzipien übernehmen, aber Insolvenzfachlogik durch Agenturprozesse ersetzen. Keine echten Kundendaten, bestehenden Passwörter oder Zugangsschlüssel kopieren. Die Referenzanwendung unverändert lassen.

## 3. Design

Hochwertiges, ruhiges Schwarz-Gold-Design. Die Insolvenzhelden-Vorlage enthält zusätzlich Blau-/Cyan-Akzente; bei Next Consulting dominieren ausdrücklich Schwarz und Gold.

- Hintergrund `#08090B`, tiefe Fläche `#030405`.
- Karten `#121315`, erhöhte Flächen `#1A1B1E`.
- Gold aus der Vorlage `#D5AA57`, helles Gold `#E4C276`.
- Haupttext `#F4F3EF`, Sekundärtext `#AAA9A3`.
- Zurückhaltende goldene Konturen, großzügige Abstände, dezente Schatten.
- Geist für Text und Überschriften; Geist Mono für Timer und Kennzahlen.
- Kartenradius bis 24 px, Inhaltsbreite maximal 1280 px.
- Große, klare Typografie. Keine Goldflächen hinter langen Texten, keine überladenen Effekte.
- Mobile zuerst, sichtbare Fokuszustände, mindestens 44 px große Touch-Ziele, reduzierte Bewegung respektieren.
- Startseite als überzeugende Angebotsseite; CRM als konzentrierte Arbeitsoberfläche mit unmittelbar erreichbarer Projektauswahl und Timern.

## 4. Einmalige Projektpakete

Alle folgenden Preise sind netto zuzüglich gesetzlicher Umsatzsteuer. Festpreis erst nach schriftlich definiertem Umfang; „ab“ ist der Einstieg für den hier genannten Standardumfang.

| Paket | Website-Preis | Ziel und Umfang |
|---|---:|---|
| **Launch** | **ab 4.900 € einmalig** | Professionelle Website mit einfachen Automatisierungen |
| **Business** | **ab 14.900 € einmalig** | Website plus eigenes, klar begrenztes CRM und zusammenhängende Prozesse |
| **Enterprise** | **auf Anfrage** | Individuelle Plattform, komplexe Integrationen und besondere Betriebsanforderungen |

### Launch – Ihr digitaler Start. Mit System.

Für Selbstständige und kleinere Dienstleistungsunternehmen, die einen professionellen Auftritt und einen verlässlichen Weg von der Anfrage zum Termin benötigen.

- Eine Sprache, bis zu fünf Inhaltsseiten; bereitgestellte Impressums- und Datenschutztexte zusätzlich einpflegen.
- Individuelle Gestaltung, responsive Umsetzung und technische SEO-Grundlagen.
- Kontakt- oder Projektanfrageformular mit Spam-Schutz.
- Einbindung einer vorhandenen Terminbuchung.
- Zwei einfache Automatisierungen, zum Beispiel Eingangsbestätigung und Übergabe einer Anfrage an ein vorhandenes CRM.
- Höchstens zwei externe Systeme mit dokumentierter Standardschnittstelle.
- Zwei gebündelte Korrekturrunden innerhalb des vereinbarten Umfangs.
- Einführung und Übergabe.

Eine einfache Automatisierung bedeutet: ein Auslöser, höchstens drei klar definierte Folgeschritte, keine individuelle Entscheidungsplattform. Ein eigenes CRM, eigene Kundenkonten, komplexe KI-Agenten und ein individuell entwickeltes Buchungssystem gehören in Business oder Enterprise. KI kann nach Prüfung ergänzend angeboten werden; kein unbegrenzter KI-Betrieb im Launch-Festpreis.

### Business – Aus Ihrer Website wird ein Arbeitswerkzeug.

Für Unternehmen, die Anfragen, Kunden und Aufgaben zentral bearbeiten und wiederkehrende Abläufe automatisieren möchten.

- Eine Sprache, bis zu zehn Inhaltsseiten.
- Individuelles CRM als begrenzte erste Version mit vier Modulen: Kontakte/Kunden, Vertriebspipeline, Projekte/Aufgaben und Aktivitätsverlauf.
- Mitarbeiter-Login mit zwei internen Rollen: Administrator und Mitarbeiter; bis zu zehn initial eingerichtete Nutzer.
- Bis zu fünf vereinbarte Automatisierungen und drei dokumentierte Standardschnittstellen.
- Eine eng begrenzte KI-Funktion, beispielsweise Anfragezusammenfassung oder Klassifizierung, mit menschlicher Prüfung vor Außenwirkung.
- Einfache CSV-Erstübernahme aus einer abgestimmten Vorlage, ohne umfangreiche Datenbereinigung.
- Drei gebündelte Korrekturrunden, Einweisung und Betriebsübergabe.

Ein zusätzlicher Kundenportal-Login, individuelle Buchungslogik, komplexe Rechnungsprozesse, mehrere Gesellschaften oder umfangreiche Datenmigration sind separat zu kalkulieren. Ein vollständiger Funktionsumfang wie Insolvenzhelden wird nicht pauschal für 14.900 € versprochen.

### Enterprise – Entwickelt für Ihre Abläufe.

Für größere Plattformen und anspruchsvolle Vorhaben: Mandantenfähigkeit, Kunden- und Partnerportale, individuelle Buchungs- und Abrechnungssysteme, mehrere Rollen und Gesellschaften, komplexe KI-Prozesse, größere Migrationen, ERP-Anbindungen und vereinbarte Service-Level.

- Gemeinsame Prozess- und Architekturaufnahme.
- Individuelles Pflichtenheft, Meilensteine und Abnahmekriterien.
- Budget und Betriebsmodell nach Analyse.
- Interne Budgetorientierung: typischer Zielkorridor ab 35.000 €, große Vorhaben deutlich darüber; nicht als pauschales Leistungsversprechen veröffentlichen.
- Bezahlte Konzeptphase als Angebot ab 2.500 € erwägen; Anrechnung nur ausdrücklich vereinbaren.

## 5. Monatliche Betreuung

Betreuung und Erstellung als zwei getrennte Vertragspositionen darstellen. Betreuung startet mit der vereinbarten Betriebsübernahme. Die Pakete sind Vorschläge und vor Verkauf wirtschaftlich und vertraglich zu finalisieren.

| Leistung | **Care** | **Care Plus** | **Care Dedicated** |
|---|---:|---:|---:|
| Monatspreis | **249 €** | **749 €** | **ab 1.990 €** |
| Passend für | Launch | Business | Enterprise |
| Kleine Änderungsaufträge pro Monat | bis zu 2 | bis zu 6 | bis zu 12 |
| Gemeinsames Zeitbudget dieser Änderungen | 1 Stunde | 4 Stunden | 12 Stunden |
| Erste Rückmeldung innerhalb der Servicezeiten | 2 Arbeitstage | 1 Arbeitstag | 4 Servicestunden |
| Betreuung bestehender Automatisierungen | Basisprüfung | laufende Funktionskontrolle | vereinbartes Monitoring und Priorisierung |
| Abstimmung | bei Bedarf im Kontingent | monatlich 30 Minuten zusätzlich | monatlich 60 Minuten zusätzlich |
| Bericht | Statusübersicht | Monatsbericht | Monatsbericht mit Maßnahmenplanung |

In allen Paketen: Überwachung der Erreichbarkeit, planbare Pflege unterstützter Abhängigkeiten, Prüfung konfigurierter Datensicherungen und Bearbeitung technischer Störungen im vereinbarten Betriebsumfang. Aufwand für reguläre Wartung getrennt vom Änderungsbudget kalkulieren und im Servicevertrag abgrenzen; keine unbegrenzte Wiederherstellung oder Weiterentwicklung versprechen.

Definitionen für Website und Vertrag:

- Sowohl Auftragsanzahl als auch gemeinsames Stundenbudget gelten. Ein Änderungsauftrag ist eine gebündelte, klar beschriebene Anpassung an einer bestehenden Funktion, etwa Text, Bild, Formularfeld oder vorhandener Automatisierungsregel.
- Eine neue Seite, ein neues Modul, eine neue Schnittstelle oder ein grundlegender Umbau ist eine Erweiterung mit eigenem Angebot.
- Mehrbedarf nach Freigabe: vorgeschlagen **140 € netto pro Stunde**. Abrechnungsintervall transparent vereinbaren; nicht jeden Start-Stopp einzeln aufrunden.
- Kontingente werden standardmäßig nicht in Folgemonate übertragen. Warnung bei 80 % und Freigabe vor Überschreitung.
- Servicezeiten als Vorschlag: Montag–Freitag, 9–17 Uhr, Europe/Berlin, ausgenommen vereinbarte Feiertage. Rückmeldung ist keine garantierte Behebung. 24/7 und garantierte Verfügbarkeit nur als gesondertes SLA.
- Infrastruktur und Verbrauch werden separat ausgewiesen: Hosting, Datenbank, Domains, KI-Nutzung, E-Mail/SMS, Automatisierungsplattformen und weitere Lizenzen. Administration ist Teil der Betreuung, Anbietergebühren nicht automatisch.
- Vorschlag für Laufzeit: zunächst sechs Monate, anschließend monatlich kündbar mit einem Monat Frist. Projektbezogene Abweichungen im Angebot festhalten.
- Kunden sollen ein nachvollziehbares Gesamtkostenbild aus Erstellung, Betreuung und geschätzten Anbietergebühren erhalten.

## 6. Erste Landingpage-Texte

### Navigation

Leistungen · Projekte · Pakete · Betreuung · Ablauf · Kundenlogin. Hauptbutton: **Projekt besprechen**.

### Hero

Kleine Zeile: **Websites · Automatisierung · KI · CRM**

Headline: **Ihre nächste Website kann mehr.**

Text: „Wir entwickeln Websites, die zu Ihrem Unternehmen passen – und verbinden sie mit den Abläufen dahinter. Von der ersten Anfrage über die Terminbuchung bis zum eigenen CRM: Next Consulting macht aus Ihrer digitalen Präsenz ein Werkzeug für Ihren Arbeitsalltag.“

Buttons: **Projekt besprechen** und **Projekte entdecken**.

Unterzeile: „Individuell entwickelt. Verständlich erklärt. Persönlich betreut.“

### Leistungen

Headline: **Ein guter Auftritt ist der Anfang.**

Einleitung: „Wenn Anfragen, Termine und Kundendaten zusammenspielen, wird aus einer Website ein System, das Ihr Team unterstützt.“

- **Websites mit klarem Ziel.** „Wir bringen Ihr Angebot auf den Punkt und gestalten einen verständlichen Weg von Interesse zu Anfrage – auf dem Smartphone genauso wie am Schreibtisch.“
- **Automatisierungen für den Alltag.** „Eingangsbestätigungen, Aufgaben, Datenübergaben und Terminabläufe: Wir verbinden wiederkehrende Schritte, damit Informationen dort ankommen, wo sie gebraucht werden.“
- **KI mit einer konkreten Aufgabe.** „Anfragen zusammenfassen, Inhalte vorbereiten oder Informationen strukturieren. Wir setzen KI dort ein, wo sie Ihre Arbeit sinnvoll ergänzt.“
- **Ihr CRM. Ihre Abläufe.** „Kunden, Projekte und nächste Schritte an einem Ort. Wir entwickeln die Funktionen, die Ihr Team tatsächlich braucht.“
- **Buchungen, die ins System passen.** „Von der Terminvereinbarung bis zur Verwaltung von Buchungen: Wir gestalten den passenden Ablauf für Ihr Angebot.“
- **Betreuung nach dem Start.** „Auch nach der Veröffentlichung bleiben wir an Ihrer Seite – mit technischer Pflege, planbaren Änderungen und einem festen Ansprechpartner.“

### Portfolio

Headline: **Digitale Projekte aus unserer Arbeit.**

Einleitung: „Unsere Arbeit reicht von digitalen Serviceangeboten bis zu individuellen Plattformen und Buchungslösungen. Hier geben wir einen ersten Einblick.“

Referenzen als bearbeitbare Einträge mit Titel, Kurztext, Kategorie, Projektstatus, optionaler URL, freigegebenem Bild und Freigabestatus pflegen. Eigenprojekte und externe Kundenprojekte korrekt kennzeichnen, sobald die Zuordnung bestätigt ist. Keine erfundenen Kennzahlen, Bewertungen, Kundenzitate oder unbestätigten Live-Links ergänzen.

1. **Insolvenzhelden** — „Digitale Anfrageprozesse, rollenbasierte Zugänge und eine zentrale Kundenverwaltung. Ein Beispiel dafür, wie Website und interne Bearbeitung zusammengeführt werden können.“ Tags: Website, CRM, Workflows. Lokaler Entwicklungsstand geprüft; Live-Status gesondert bestätigen.
2. **Posthelden** — „Ein weiteres Projekt aus unserer Helden-Reihe. Den konkreten Leistungsumfang und ausgewählte Einblicke ergänzen wir hier.“ Derzeit redaktioneller Entwurf ohne behauptete Funktionen.
3. **Finanzhelden** — „Ein digitaler Auftritt aus unserem Projektportfolio. Informationen zum Projekt und zu unserer Umsetzung folgen.“ Derzeit redaktioneller Entwurf ohne behauptete Funktionen.
4. **Goldhelden** — „Ein weiteres Beispiel aus unserer Projektarbeit. Projektziele, Gestaltung und technische Umsetzung stellen wir hier im Detail vor.“ Derzeit redaktioneller Entwurf ohne behauptete Funktionen.
5. **Finde dein Ding – Markus Becker** — „Aktuell entwickeln wir den digitalen Auftritt für ‚Finde dein Ding‘ von Markus Becker. Ein Einblick in ein laufendes Projekt – vom Konzept zur Umsetzung.“ Status gemäß Auftrag: **In Entwicklung**.
6. **Aurelia Flow** — „Ein digitaler Auftritt mit Buchungssystem. Das Projekt zeigt, wie Präsentation und die Buchung eines Angebots in einem zusammenhängenden Ablauf gestaltet werden können.“ Buchungssystem gemäß Auftrag; konkrete Funktionen und Screenshots vor Veröffentlichung verifizieren.

In einer internen Vorschau alle sechs Karten zeigen, unvollständige Karten als Entwurf kennzeichnen. Auf der öffentlichen Website ausschließlich freigegebene, inhaltlich bestätigte Karten ausspielen. Für bestätigte Referenzen eine Detailansicht mit Ausgangslage, unserer Leistung, umgesetzten Funktionen und Bildern vorsehen. Erfolgszahlen nur mit Beleg.

### Pakete

Headline: **Der passende Einstieg. Mit Raum zum Wachsen.**

Text: „Eine Website mit ersten Automatisierungen oder eine eigene Plattform: Wir definieren gemeinsam, was Sie brauchen. Sie erhalten einen klaren Leistungsumfang und ein nachvollziehbares Angebot.“

Die drei Karten aus Abschnitt 4 übernehmen. Business als **Website + CRM** hervorheben; keine unbelegte Aussage „am häufigsten gebucht“ verwenden. CTAs: **Launch besprechen**, **Business planen**, **Enterprise anfragen**. Auswahl ins Anfrageformular übernehmen.

### Betreuung

Headline: **Online bleiben. Schritt für Schritt besser werden.**

Text: „Nach dem Start kümmern wir uns um den vereinbarten technischen Betrieb und Ihre nächsten Anpassungen. Mit einem monatlichen Betreuungspaket bleiben Aufgaben, Leistungen und Kosten übersichtlich.“

Die drei Betreuungspakete aus Abschnitt 5 mit sichtbarem Stundenbudget und Rückmeldezeit darstellen. Drittkostenhinweis unmittelbar bei den Preisen anzeigen.

### Ablauf

1. **Verstehen.** „Wir besprechen Ihr Angebot, Ihre Kunden und die Abläufe, die Sie vereinfachen möchten.“
2. **Planen.** „Sie erhalten einen Vorschlag mit Umfang, Preis und nachvollziehbaren Meilensteinen.“
3. **Entwickeln.** „Wir setzen Design und Funktionen um. Sie sehen den Fortschritt und geben gezielt Feedback.“
4. **Starten und betreuen.** „Nach Prüfung und Freigabe geht Ihr Projekt online. Danach begleiten wir den Betrieb und die Weiterentwicklung.“

### FAQ

**Brauchen wir sofort ein eigenes CRM?** „Nicht immer. Häufig reicht es zunächst, Ihre Website mit vorhandenen Werkzeugen zu verbinden. Ein eigenes CRM ist sinnvoll, wenn Standardlösungen Ihre Abläufe nicht ausreichend abbilden.“

**Können wir später erweitern?** „Ja. Wir berücksichtigen absehbare nächste Schritte bereits in der Planung und bieten Erweiterungen mit einem eigenen Leistungsumfang an.“

**Sind KI- und Softwarekosten enthalten?** „Die vereinbarte Einrichtung ist Teil des Projektangebots. Laufende Anbieter- und Verbrauchskosten weisen wir gesondert aus.“

**Was zählt als monatliche Änderung?** „Eine überschaubare Anpassung an bestehenden Inhalten oder Funktionen. Es gelten die Anzahl der Änderungsaufträge und das gemeinsame Zeitbudget Ihres Betreuungspakets.“

**Wie lange dauert die Umsetzung?** „Das hängt von Funktionen, Schnittstellen und verfügbaren Inhalten ab. Den verbindlichen Zeitplan legen wir nach der Projektaufnahme gemeinsam fest.“

### Kontakt

Headline: **Was soll Ihr Unternehmen als Nächstes können?**

Text: „Erzählen Sie uns von Ihrem Vorhaben. Wir klären gemeinsam, welche Website, welche Automatisierungen und welche Systeme dazu passen.“

Formular: Name, Unternehmen, geschäftliche E-Mail, Telefon optional, gewünschtes Paket, Projektbeschreibung; Budgetrahmen optional. Datensparsam, klare Labels, Spam-Schutz, serverseitige Validierung und verständliche Fehlermeldungen. Keine Erfolgsmeldung ohne erfolgreich gespeicherte Anfrage. Keine erfundene Telefonnummer oder E-Mail-Adresse verwenden.

Abschlussbutton: **Projektanfrage senden**. Bestätigung: „Vielen Dank. Ihre Anfrage ist bei uns eingegangen. Wir melden uns, um die nächsten Schritte zu besprechen.“

Footer: Next Consulting · Websites, Automatisierung, KI und CRM · Impressum · Datenschutz · Kundenlogin. Rechtliche Unternehmensangaben müssen vom Betreiber geliefert werden; keine erfundenen Pflichttexte veröffentlichen.

## 7. CRM-Navigation und Kundenakte

Geschützte Oberfläche unter `/crm`, Login unter `/login`, getrenntes Kundenportal unter `/portal`.

Hauptnavigation:

1. Dashboard: aktive Projekte, anstehende Aufgaben, Betreuungsumsatz pro Monat, offene Rechnungen, Kontingente und beide Timer.
2. Interessenten: Anfrageeingang und Pipeline Neu → Qualifiziert → Gespräch → Angebot → Gewonnen/Verloren.
3. Kunden: Firmen, Ansprechpartner, Rechnungsdaten, Zuständigkeiten und Notizen.
4. Projekte: Übersicht und Detailansicht mit Status, Budget, Meilensteinen, Aufgaben und Freigaben.
5. Zeiterfassung: interne Arbeitszeit, externe Projektzeit, Prüfung und Leistungsnachweise.
6. Angebote und Verträge: Einmalprojekte, Meilensteine, Betreuung, Stundensätze und Abrechnungsregeln.
7. Rechnungen: Entwürfe, ausgestellte Rechnungen, Zahlungen, Stornos und Versandstatus.
8. Betreuung: Pakete, Laufzeiten, Änderungen, Kontingente und nächste Abrechnung.
9. Kommunikation und Termine: Kommunikationshistorie, Vorlagen und Termine.
10. Team und Rollen: Zugänge und Projektzuweisungen.
11. Einstellungen: Firmendaten, Steuern, Nummernkreise, Integrationen und Textinhalte.

Kundenakte wie in der Vorlage mit eigener Unternavigation: Übersicht · Stammdaten · Ansprechpartner · Projekte · Angebote/Verträge · Betreuung · Rechnungen/Zahlungen · Dokumente · Kommunikation · Historie. Interne Kennzahlen und Notizen nur für berechtigte Mitarbeiter.

Projektstatus: Anfrage, Konzeption, Design, Entwicklung, Kundenprüfung, Live, Betreuung, Pausiert, Archiviert. Projekte können mehrere Mitarbeiter und Aufgaben haben; jeder Zeit- und Rechnungsbezug muss auf einen konkreten Kunden und ein konkretes Projekt auflösbar sein.

## 8. Zwei unabhängige Timer

Oben im Dashboard eine schnelle Projektauswahl und zwei getrennte Bedienfelder:

- **Interne Arbeitszeit:** Start / Stopp. Misst tatsächliche aktive Arbeit, insbesondere Spracheingabe, Umsetzung, Prüfung und aktive Abstimmung.
- **Externe Projektzeit:** Start / Stopp. Misst den projektbezogenen Zeitrahmen einschließlich ausdrücklich vereinbarter abrechenbarer Begleit- oder Wartezeiten.

Beide Timer dürfen für dasselbe Projekt gleichzeitig laufen und werden unabhängig gespeichert. Ein Mitarbeiter kann intern höchstens einen laufenden Timer haben und extern höchstens einen laufenden Timer. Im ersten Release müssen gleichzeitig laufende interne und externe Timer demselben Projekt zugeordnet sein; Projektwechsel erfolgt ausdrücklich mit Stopp oder Wechselbestätigung.

Externe Zeit ist zunächst **erfasste Projektzeit**, nicht automatisch eine Rechnung. Die Oberfläche unterscheidet Rohdauer, freigegebene abrechenbare Dauer und tatsächlich fakturierte Dauer. Kein pauschaler Multiplikator, keine erfundenen Stunden und keine Regel, dass extern immer größer sein muss.

Externe Abschnitte nach Tätigkeit klassifizieren: aktive Leistung, betreute Verarbeitung/Testlauf, vereinbarte Bereitschaft/Wartezeit, nicht abrechenbare Unterbrechung. Kategorieänderung beendet den vorherigen Abschnitt atomar und startet den nächsten. Interne Notizen bleiben intern; externe Leistungsbeschreibungen sind gesonderte Felder.

Beispiel: Externer Projektzeitraum 09:00–11:00 Uhr, aktive interne Arbeit insgesamt 35 Minuten. Anzeige intern 0:35 h, extern 2:00 h. In Rechnung gestellt werden nur die vertraglich abrechenbaren und freigegebenen Abschnitte; möglicherweise 2:00 h, möglicherweise weniger. Der Leistungsnachweis beschreibt Arbeits- und Warteanteile transparent. Weder interne Zeit noch externe Rohzeit automatisch gegeneinander verrechnen.

Technik und Bedienung:

- Start und Stopp über authentifizierte Serverendpunkte; Zeitstempel aus Datenbank/Server, in UTC speichern und in Europe/Berlin anzeigen.
- Laufende Einträge über Datenbank-Constraints absichern; Doppelklick und mehrere Browser-Tabs dürfen keine Duplikate erzeugen.
- Die Anzeige wird aus gespeicherter Startzeit berechnet. Timer laufen bei Tabwechsel, Hintergrundmodus und Neuladen weiter; kein bloßer lokaler JavaScript-Zähler als Datengrundlage.
- Bei Netzwerkausfall nicht behaupten, Start/Stopp sei gespeichert. Status und Wiederholungsmöglichkeit anzeigen; fehlende Zeiten später mit Begründung korrigieren.
- Vergessene Timer markieren, nach längerer Laufzeit erinnern; keine stillen Kürzungen oder automatischen Rechnungen.
- Korrekturen mit ursprünglichen Werten, Bearbeiter und Begründung protokollieren.
- Monatsgrenzen korrekt aufteilen; Sommerzeitwechsel und offene Sessions berücksichtigen.
- Freigabe durch berechtigte Rolle vor Abrechnung; bereits fakturierte Einträge sperren und Korrekturen als nachvollziehbare Folgebelege behandeln.
- Bei Festpreisprojekten dienen Zeiten der Kalkulation. Bei Betreuung zuerst vereinbartes Kontingent anwenden; zusätzliche Stunden nur nach Freigabe abrechnen. Dieselbe Zeit darf nicht zugleich als inklusive und als Mehrleistung fakturiert werden.
- Kunden sehen nur freigegebene externe Leistungsnachweise. Interne Zeiten und Kalkulationen werden auch aus API-Antworten und Exporten ausgeschlossen.

## 9. Monatliche Rechnungen und Zahlungen

Kunden wählen nicht nur einen Tarif: Das CRM speichert einen konkreten Vertrag mit gültigem Preis, Startdatum, Leistungszeitraum, Steuerkonfiguration, Kontingent und Zahlungsbedingungen. Spätere Änderungen des öffentlichen Preises verändern bestehende Verträge nicht automatisch.

- Einmalige Projektpositionen und Meilensteine von wiederkehrender Betreuung trennen.
- Vorschlag Projektzahlung: 40 % zum Start, 40 % nach vereinbartem Meilenstein, 20 % nach Abnahme. Bei größeren Projekten individuelle Meilensteine.
- Betreuung monatlich im Voraus, freigegebene variable Leistungen des Vormonats im Nachhinein; nachvollziehbare Perioden auf der Rechnung.
- Geplanter Job prüft täglich fällige Verträge und erzeugt je Vertrag und Leistungsperiode höchstens eine reguläre Abrechnung, transaktional und mit eindeutiger Idempotenzkennung.
- Entwurf → geprüft/ausgestellt → Versand ausstehend → versendet; Zahlungsstatus separat offen, teilweise bezahlt, bezahlt, überfällig. Versandfehler führen zu erneutem Versand desselben Belegs, nicht zu einer neuen Rechnung.
- PDF, Belegnummer, Leistungszeitraum, Positionen, Mengen, Nettobeträge, Steuer und Gesamtbetrag speichern. Geld in ganzzahligen Centbeträgen; gültige Steuerregeln konfigurierbar. Nummern erst bei Ausstellung verbindlich vergeben und Ausstellungen unveränderlich speichern.
- Für erforderliche strukturierte E-Rechnungen einen geeigneten Anbieter bzw. validierte Ausgabe integrieren; eine PDF allein nicht als strukturierte E-Rechnung bezeichnen. Konkrete steuerliche Anforderungen vor Produktivbetrieb mit dem Betreiber abstimmen.
- Gutschrift/Storno als eigene verknüpfte Belege statt ausgestellte Rechnungen zu überschreiben.
- E-Mail-Versand über verifizierte Absenderdomain, mit Zustellstatus und Fehlerbehandlung. Nach Aktivierung erhält jeder Kunde seine monatliche Rechnung automatisch.
- Für die Inbetriebnahme Testmodus mit synthetischen Empfängern. Produktiven Versand pro Vertrag ausdrücklich aktivieren; keine Testrechnungen an echte Kunden.
- Zahlungsabgleich optional über einen freigegebenen Zahlungsanbieter. Signierte Webhooks und idempotente Verarbeitung; Versand ist kein Zahlungsnachweis.
- Wiederkehrende Rechnungserstellung ist nicht automatisch ein Lastschrifteinzug. Einzug erst nach gesonderter Einrichtung und passender Kundenzustimmung.

## 10. Anmeldung und Rollen

- `global_admin`: alle Kunden, Team, Projekte, Finanzdaten, Einstellungen und Freigaben.
- `admin`: operative Verwaltung mit explizit vergebenen Rechten.
- `employee`: zugewiesene Projekte, Aufgaben und eigene Zeitbuchungen.
- `finance`: Verträge, Belege und freigegebene Abrechnungsdaten.
- `customer`: ausschließlich eigene freigegebene Projekte, Dokumente und Rechnungen.

Gewünschter erster Benutzername: **`Global_Admin`**. Rolle: `global_admin`. Das vom Betreiber im Gespräch vorgegebene Passwort ausschließlich über einen geschützten serverseitigen Einrichtungsweg übernehmen; nicht in diesem Brief, Quelltext, Seeds, SQL-Migrationen oder Client-Bundle ablegen. Solange Supabase und Authentifizierung nicht eingerichtet sind, ist dieser Benutzer nicht angelegt.

Vorzugsweise Supabase Auth mit geschützter Zuordnung von Benutzernamen zu Auth-Identität verwenden. Notwendige Admin-E-Mail bzw. Wiederherstellungsadresse beim Betreiber erfragen, keine öffentliche E-Mail erfinden. Einrichtung einmalig, idempotent und serverseitig; keine allgemein erreichbare Admin-Erstellungsroute. Registrierung darf nie eine selbstgewählte Adminrolle akzeptieren.

Geschützte Sitzungen, serverseitige Rollenprüfung, Login-Begrenzung und funktionierende Abmeldung. RLS für kundenbezogene Datensätze; Rollen und Kundenidentität aus der vertrauenswürdigen Sitzung ableiten. Service-Schlüssel nur serverseitig. Versteckte Menüpunkte ersetzen keine Berechtigungsprüfung. Interne Zeiten in separaten geschützten Tabellen bzw. ausschließlich internen Zugriffspfaden halten; RLS allein schützt nicht einzelne Spalten.

## 11. Datenmodell

Separates Supabase-Projekt für Next Consulting, mit versionierten Migrationen und getrennten Entwicklungs-/Produktionskonfigurationen. Vor Erstellung Organisation und Region feststellen; EU-Region als Vorschlag. Kostenpflichtige Optionen nicht ohne festgelegten Kostenrahmen buchen.

Wesentliche Entitäten:

- `profiles`, `roles`, `role_permissions`: Auth-Verknüpfung und Rechte.
- `customers`, `customer_contacts`, `customer_memberships`: Firmen, Ansprechpartner und Portalzuordnung.
- `leads`, `lead_activities`: Interessenten und Pipeline.
- `projects`, `project_members`, `milestones`, `tasks`: Projektarbeit.
- `offers`, `offer_items`, `contracts`, `contract_items`: Preise und Vereinbarungen als versionierte Snapshots.
- `service_plans`, `subscriptions`, `service_periods`, `change_requests`: Betreuung und Kontingente.
- `internal_time_entries`: interne Arbeit, geschützt vor Kundenzugriff.
- `external_time_entries`, `time_approvals`: externe Abschnitte und Freigaben.
- `invoices`, `invoice_items`, `invoice_time_allocations`: Belege und eindeutige Zeitzuordnung.
- `payments`, `payment_allocations`: tatsächliche Zahlungen und Belegzuordnung.
- `documents`, `communications`, `email_deliveries`: private Dokumente und nachvollziehbarer Versand.
- `portfolio_entries`, `site_content`: bearbeitbare öffentliche Inhalte und Freigaben.
- `audit_events`, `billing_runs`, `webhook_events`: Historie und zuverlässige Wiederholung.

Kundenbezogene Tabellen mit konsistenten Fremdschlüsseln absichern, damit ein Projekt von Kunde A nicht mit einer Rechnung von Kunde B verknüpft werden kann. Private Dokumente mit kurzlebigen autorisierten Download-Links. Referenz- und CRM-Demodaten eindeutig synthetisch halten.

## 12. Umsetzung und Abnahme

Den vorhandenen Stack prüfen und ein sauberes Next.js-/TypeScript-Projekt für Vercel und Supabase verwenden. Konfiguration bestehender Projekte respektieren. Kein Deployment in Insolvenzhelden oder Aurelia Flow. Das vorhandene Vercel-Projekt `nex-consulting` verwenden; Domain erst nach Eigentumsprüfung und vollständiger Konfiguration anschließen.

Reihenfolge:

1. Landingpage mit obigen Texten, Paketen, Referenzentwürfen und Schwarz-Gold-Design; Inhalte zentral editierbar.
2. Supabase-Zugang und Projekt, Migrationen, echte Authentifizierung, Rollen und `Global_Admin` einrichten.
3. Kunden, Projekte und beide persistenten Timer durchgängig implementieren.
4. Betreuungsverträge, Kontingente, Freigaben, Rechnungserstellung und Testversand implementieren.
5. Kundenportal, Projektfreigaben und produktive Integrationen fertigstellen; Domain und Versand aktivieren.

Eine visuelle Vorschau ist kein fertiges CRM. Fehlende Integrationen offen kennzeichnen; keine Scheinanmeldung, lokale Passwortprüfung oder nur im Browser gespeicherte Produktivdaten als fertige Funktion ausgeben.

Abnahmekriterien:

- Auftritt verwendet Next Consulting und ausschließlich die gewünschte .com-Domain für Produktionsmetadaten.
- Pakete und Betreuung entsprechen den definierten Grenzen; Buttons übergeben die richtige Auswahl.
- Formular speichert Anfragen dauerhaft und zeigt echte Fehler-/Erfolgszustände.
- Global_Admin kann sich nach Einrichtung anmelden; falsche Zugangsdaten scheitern; gesperrte Nutzer verlieren Zugriff.
- Kunde A kann weder UI noch API oder Dokument-URLs von Kunde B lesen; Mitarbeiter können keine Adminrechte vergeben.
- Beide Timer starten/stoppen unabhängig, überstehen Neuladen und Hintergrundmodus und verhindern Duplikate bei Doppelklick bzw. konkurrierenden Tabs.
- Interne Zeiten erscheinen niemals im Kundenportal, öffentlichen API-Antworten oder Kundenexporten.
- Nicht freigegebene, nicht vereinbarte oder schon abgerechnete Zeit wird nicht erneut fakturiert.
- Monatswechsel, Sommerzeit, Kontingentüberschreitung, Kündigung, Preisänderung, Teilzahlung und Storno sind geprüft.
- Wiederholter Rechnungslauf und wiederholter Webhook erzeugen keine Doppelrechnung oder Doppelzahlung.
- Versandfehler lassen sich wiederholen; ausgefallene Hintergrundjobs werden erkannt.
- Oberfläche bei 360 px, 390 px, Tablet und Desktop prüfen; Tastatur, lange deutsche Texte, leere Listen, Lade- und Fehlerzustände berücksichtigen.
- Build und passende Integrations-/Berechtigungstests erfolgreich, bevor die Anwendung als produktiv bezeichnet wird.

## 13. Preisbegründung und recherchierte Orientierung

Die vorgeschlagenen 4.900 € / 14.900 € / Enterprise auf Anfrage sind eine eigene Positionierung für individuelle Entwicklung, keine statistischen Marktmittelwerte. Ein eigenes CRM ist deutlich mehr als eine Unternehmenswebsite. Konzept, Abstimmung, Qualitätssicherung, Einführung und Nachbesserungsrisiko gehören in die Kalkulation, auch bei schneller KI-gestützter Umsetzung.

Interne Beispielrechnung, Annahmen noch zu validieren: Launch mit 35 Gesamtstunden und 90 € kalkulatorischem Vollkostensatz = 3.150 € vor Risiko/Gewinn; 4.900 € Umsatz lässt 1.750 € dafür. Business mit 100 Gesamtstunden = 9.000 € vor Risiko/Gewinn; 14.900 € lässt 5.900 €. Das sind keine real gemessenen Kosten. Werden Umfang oder Aufwand höher, muss der Preis angepasst werden. Tatsächliche interne Zeit und Vollkosten nach den ersten Projekten auswerten.

Care Plus mit vier Änderungsstunden bei diesem angenommenen Vollkostensatz bindet bereits 360 €; aus den verbleibenden 389 € müssen Wartung, Abstimmung, Verwaltung, Risiko und Gewinn gedeckt werden. Deshalb Stunden und Auftragszahl begrenzen und Drittkosten separat halten.

Geprüfte Anbieter als begrenzte Orientierung (Abruf 11.09.2026):

- [LiaViva – Preise](https://www.liaviva.de/preise): Website-Pakete ab 1.490 €, 2.990 € und 4.990 €, Betreuung 79 €, 129 € und 199 € monatlich. Umfänge und enthaltene Änderungszeit sind enger als unser Business-CRM. Dies stützt die Trennung zwischen Erstellung, Betreuung und Zusatzkosten, nicht die Gleichwertigkeit der Angebote.
- [NextLevel Automation](https://nextlevel-automation.de/): bietet Website-, KI- und Automatisierungsleistungen mit getrennten Setup- und monatlichen Preisen an. Beispiel auf der Website: KI-Telefonassistent ab 3.490 € Setup und 199 € monatlich. Derartige Module sind gesondert zu kalkulieren; ein Telefonassistent ist kein automatischer Bestandteil unserer Pakete.

## 14. Noch benötigte Betriebsangaben

Diese Punkte blockieren die entsprechende Inbetriebnahme, nicht das Erstellen der Texte und Oberfläche:

- Supabase-Zugang und Organisation sind verbunden; Admin-Wiederherstellungsadresse und Kostenrahmen für spätere Erweiterungen noch festlegen.
- Bestätigung der genauen Designreferenz und Zugang zur Domain next-consulting.com.
- Rechtlicher Betreiber, Rechnungs-/Steuerangaben und Bankverbindung.
- Absender für Rechnungen, E-Mail-Anbieter und ggf. Zahlungsanbieter.
- Verifizierte Portfolio-URLs, Bilder, Projektstatus und Zuordnung Eigenprojekt/Kundenprojekt.

Das im Gespräch genannte Admin-Passwort bleibt außerhalb dieses übertragbaren Dokuments.
