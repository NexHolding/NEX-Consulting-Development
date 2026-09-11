#!/usr/bin/env bash
set -euo pipefail

# Skript zum Anlegen eines GitHub-Repositories und pushen des aktuellen Ordners.
# Benötigt: GITHUB_TOKEN (oder gh CLI angemeldet)

REPO_NAME="NEX-Consulting-Development"
VISIBILITY="public" # oder private

if command -v gh >/dev/null 2>&1; then
  echo "Erstelle Repo mit gh CLI..."
  gh repo create "$REPO_NAME" --${VISIBILITY} --source=. --remote=origin --push
else
  if [ -z "${GITHUB_TOKEN-}" ]; then
    echo "Bitte GITHUB_TOKEN setzen oder gh CLI installieren und anmelden." >&2
    exit 1
  fi
  echo "Erstelle Repo via GitHub API..."
  curl -s -H "Authorization: token $GITHUB_TOKEN" \
    -d "{\"name\": \"$REPO_NAME\", \"private\": false}" \
    https://api.github.com/user/repos
  git init
  git add .
  git commit -m "chore: initial scaffold"
  git remote add origin "https://github.com/$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq -r .login)/$REPO_NAME.git"
  git push -u origin master
fi
