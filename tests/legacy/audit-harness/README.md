# Audit Harness

Script jetable utilisé pour la phase d'audit fonctionnel **0.B** du projet
claude-code-poker. Pilote le déploiement Convex dev pour rejouer 3 scénarios
multi-joueurs difficiles à reproduire manuellement.

## Prérequis

- Node 20+
- `npm install` exécuté à la racine du projet (le client `convex` est utilisé
  via `convex/browser`).
- Le déploiement Convex dev `incredible-hedgehog-551` doit être actif. Pas
  besoin de `npx convex dev` tournant : le harness parle directement à
  l'URL HTTPS du déploiement.

## Usage

```bash
# Tous les scénarios
node tests/legacy/audit-harness/index.mjs

# Un seul scénario
node tests/legacy/audit-harness/index.mjs s1
node tests/legacy/audit-harness/index.mjs s2
node tests/legacy/audit-harness/index.mjs s3
```

## Variables d'environnement

- `CONVEX_URL` : URL du déploiement à cibler. Défaut :
  `https://incredible-hedgehog-551.convex.cloud`.

## Comptes utilisés

Le harness crée (ou réutilise) `audit-bot-1@local` à `audit-bot-4@local`,
mot de passe `audit-bot-pass`. Ne pas utiliser en production.

## Tables créées

Chaque scénario crée une nouvelle table publique nommée `S1 / S2 / S3`. Les
tables ne sont **pas** supprimées en fin de run — c'est intentionnel pour
inspection post-run via le dashboard Convex. Nettoyage manuel via dashboard
si besoin.

## Sortie

Tout est loggé sur stdout au format `[ISO timestamp] [scenario] message`.
Les anomalies sont préfixées `⚠️`. Aucun fichier n'est écrit.

## Limitations connues

- Stacks initiaux égaux : les vrais side pots à montants différents
  nécessiteraient de jouer plusieurs mains pour creuser les stacks. À
  signaler comme finding si pertinent.
- Pas d'auth en mode "session" : on rappelle simplement les mutations
  signUp/signIn pour récupérer un userId. Les tokens de session ne sont
  pas gérés.
- Le harness n'est pas un test pérenne : il est dans `tests/legacy/` et
  sera retiré (ou industrialisé) après 1.B.
