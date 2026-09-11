# NEX Consulting – dauerhafte Projektvorgaben

## Bedeutung von „PUSH“

Der Nutzer hat am 11.09.2026 ausdrücklich festgelegt: Wenn er „PUSH“ oder „push“ schreibt, den vollständigen aktuellen Projektstand in allen drei verbundenen Systemen synchronisieren:

1. GitHub: `https://github.com/NexHolding/NEX-Consulting-Development.git`, Zielbranch `main`. Alle beauftragten Änderungen einschließlich Website, CRM, Kundenportal, Briefing und Migrationen committen und pushen. Remote-Änderungen zuerst integrieren; kein Force-Push.
2. Supabase: ausstehende versionierte Migrationen im verknüpften Projekt `yeaihagzvzirmnrvvbng` anwenden und Gleichstand prüfen. Bestehende Daten erhalten; kein Reset und keine Übertragung von Kundendaten nach Git.
3. Vercel: vollständigen Anwendungsstand als Production-Deployment im Projekt `nex-holding/nex-consulting` veröffentlichen; READY-Status und `https://nex-consulting.vercel.app` prüfen.

Diese ausdrückliche Vorgabe ersetzt die frühere „nur lokal / kein GitHub-Push“-Präferenz. Die Veröffentlichung des vollständigen Anwendungscodes einschließlich CRM und Kundenportal an diese Ziele ist autorisiert. Nicht erneut um dieselbe Zustimmung bitten, sofern keine neue materielle Gefahr oder technische Freigabesperre entsteht.

Vorher passende Prüfungen durchführen. Zugangsdaten, lokale `.env`-Dateien, Sitzungstoken, Datenbankinhalte und Build-Verzeichnisse nicht in Git übernehmen. „Vollständig“ bezeichnet den vollständigen Projektquellcode samt benötigten Assets und Migrationen.

## Marke

Die Marke heißt **NEX Consulting**, nicht Next Consulting. Die ausdrücklich gewünschte Domain bleibt `www.next-consulting.com` (.com, nicht .de). Design: Schwarz-Gold. Eigene Bildmotive verwenden; keine identische Wiederverwendung des Insolvenzhelden-Herofotos.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
