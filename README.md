# NEX Consulting Development

Dieses Repository enthält das Starter-Scaffold für das Projekt „NEX Consulting Development".

Ziel:
- Lokales Projekt-Scaffold.
- Skripte zum Erstellen von Repositories/Projekten in GitHub, Vercel und Supabase.
- Platzhalter für Codex- und Claude-Plugins.

Wichtig: Für automatische Erstellung von Cloud-Ressourcen benötigen die Scripts API-Tokens bzw. CLI-Authentifizierung (siehe `scripts/`).

Schnellstart:
1. Fülle die Umgebungsvariablen: `GITHUB_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_TOKEN` (falls verfügbar).
2. Prüfe die Scripts in `scripts/` und passe `ORG`/`TEAM` IDs ggf. an.
3. Führe `scripts/create_github_repo.sh` aus oder erstelle das Repo manuell.
4. Verbinde Vercel mit dem Repo via `vercel` CLI oder `scripts/create_vercel_project.sh`.
5. Erstelle Supabase-Projekt via Dashboard oder `scripts/create_supabase_project.sh` (meist manuell wegen Billing).

Bei Bedarf kann ich die Erstellung übernehmen, wenn Du mir die nötigen Zugänge (Tokens) zur Verfügung stellst oder mir erlaubst, die CLI-Befehle hier auszuführen.
