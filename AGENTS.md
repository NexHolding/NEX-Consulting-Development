# NEX Consulting – dauerhafte Projektvorgaben

## Bedeutung von „PUSH“

Der Nutzer hat am 11.09.2026 ausdrücklich festgelegt: Wenn er „PUSH“ oder „push“ schreibt, den vollständigen aktuellen Projektstand in allen drei verbundenen Systemen synchronisieren:

1. GitHub: `https://github.com/NexHolding/NEX-Consulting-Development.git`, Zielbranch `main`. Alle beauftragten Änderungen einschließlich Website, CRM, Kundenportal, Briefing und Migrationen committen und pushen. Remote-Änderungen zuerst integrieren; kein Force-Push.
2. Supabase: ausstehende versionierte Migrationen im verknüpften Projekt `yeaihagzvzirmnrvvbng` anwenden und Gleichstand prüfen. Bestehende Daten erhalten; kein Reset und keine Übertragung von Kundendaten nach Git.
3. Vercel: vollständigen Anwendungsstand als Production-Deployment im Projekt `nex-holding/nex-consulting` veröffentlichen; READY-Status und `https://nex-consulting.vercel.app` prüfen.

Diese ausdrückliche Vorgabe ersetzt die frühere „nur lokal / kein GitHub-Push“-Präferenz. Die Veröffentlichung des vollständigen Anwendungscodes einschließlich CRM und Kundenportal an diese Ziele ist autorisiert. Nicht erneut um dieselbe Zustimmung bitten, sofern keine neue materielle Gefahr oder technische Freigabesperre entsteht.

Vorher passende Prüfungen durchführen. Zugangsdaten, lokale `.env`-Dateien, Sitzungstoken, Datenbankinhalte und Build-Verzeichnisse nicht in Git übernehmen. „Vollständig“ bezeichnet den vollständigen Projektquellcode samt benötigten Assets und Migrationen.

## Marke

CRM-Gestaltung: Beide Navigationsebenen verwenden dieselbe dunkle Schwarz-Gold-Designsprache; keine helle zweite Seitenleiste. Für CRM, Portal und Login lokal eingebundene Geist-Schrift (UI, Formulare, Tabellen) und Bricolage Grotesque (Überschriften) verwenden. Einheitliche Typografie, dezente Trennlinien, tabellarische Ziffern und konsistente Karten-/Formularraster sind in `src/app/crm-design.css` zentral definiert.

Verbindliches Original-Logo seit 14.09.2026: `public/brand/nex-consulting-logo.png`; Signet: `public/brand/nex-consulting-icon.png`. In Website, CRM, Portal, Login und Belegen verwenden; keine nachgebauten NEX-Schriftzüge oder Platzhalter. Originalgrafik nicht verändern. Transparenten Außenrand nur im Layout ausgleichen. Brandfarben: Anthrazit `#292929`, Gold `#ae884c`. Typografie laut beigefügter Vorlage: Bricolage Grotesque und Meedori Sans. Die im Logo eingebettete Schrift bleibt Teil der Originalgrafik; separat gesetzter Slogan folgt der verbindlichen Textvorgabe unten.

Logoauswahl je nach Layout (ausdrückliche Nutzervorgabe vom 14.09.2026):
- Nebeneinander: `public/brand/nex-consulting-logo.png` für breite, flache Flächen wie Website-/Portal-Kopfzeilen und Belegköpfe.
- Übereinander: `public/brand/nex-consulting-logo-stacked.png` für kompakte Flächen mit ausreichend Höhe, beispielsweise zentrale Markenflächen, Titelbilder oder passende Login-Layouts. Original: 6250 × 3750 Pixel; enthält einen festen anthrazitfarbenen Hintergrund `#292929`, ist nicht transparent.
- Signet: `public/brand/nex-consulting-icon.png` für Favicons und sehr kleine quadratische Plätze.
Die passende Originalvariante nach Platz, Seitenverhältnis, Hintergrund und Lesbarkeit wählen. Niemals strecken, stauchen, umfärben, nachzeichnen oder Bestandteile neu zusammensetzen. Das gestapelte Logo nicht mit dem horizontalen Zuschnitt der bestehenden `BrandLogo`-Komponente darstellen; sein eigenes Seitenverhältnis beibehalten. Keine Logobestandteile abschneiden. Siehe `public/brand/README.md`.

Verbindlicher Slogan seit 14.09.2026: **BUILD WHAT’S NEX(T).** Schreibweise einschließlich typografischem Apostroph, Klammern und Schlusspunkt beibehalten.

Die Marke heißt **NEX Consulting**, nicht Next Consulting. Die ausdrücklich gewünschte Domain bleibt `www.next-consulting.com` (.com, nicht .de). Design: Schwarz-Gold. Eigene Bildmotive verwenden; keine identische Wiederverwendung des Insolvenzhelden-Herofotos.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Kundenzugänge

Kundenzugänge bleiben im separaten, verschlüsselten Bereich (`docs/customer-access.md`). Niemals Passwort-Klartext oder Chiffrate in CRM-/Portal-Snapshots, Logs oder Git aufnehmen. Vor dem nächsten PUSH die Migration und die serverseitige Vercel-Variable `NC_CREDENTIALS_KEY` gemäß Dokumentation bereitstellen. Den bestehenden Schlüssel nicht neu generieren oder blind überschreiben; lokale Quelle ist die ignorierte `.env.local`.
