#!/usr/bin/env bash
set -euo pipefail

# Skript-Vorlage zum Erstellen/Verbinden eines Vercel-Projekts.
# Empfohlen: vercel CLI installiert und eingeloggt (`npm i -g vercel`).
# Alternativ: VERCEL_TOKEN + Organization/Project-API via curl.

PROJECT_NAME="NEX-Consulting-Development"

if command -v vercel >/dev/null 2>&1; then
  echo "Verknüpfe Projekt mit vercel CLI (interactive)..."
  vercel --confirm --name "$PROJECT_NAME"
  echo "Für Produktion: vercel --prod"
else
  echo "Bitte vercel CLI installieren oder VERCEL_TOKEN setzen. Siehe Vercel-Dokumentation für API-Setup." >&2
  exit 1
fi
