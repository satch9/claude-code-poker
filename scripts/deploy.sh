#!/bin/bash
# Déploiement frontend statique vers nginx (home-poker.vjdev.tech).
# Le backend tourne sur Convex Cloud, rien à redémarrer côté serveur.
#
# Usage : ./scripts/deploy.sh
# Pré-requis : être dans /var/www/vincent/claude-code-poker

set -e

cd "$(dirname "$0")/.."

echo "→ git pull..."
git pull origin master

echo "→ npm install..."
npm install

echo "→ npm run build..."
npm run build

echo "✓ Déploiement terminé. dist/ mis à jour."
echo "  nginx ne nécessite pas de reload (servi en lecture seule)."
