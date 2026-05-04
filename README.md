# claude-code-poker

Application web multi-joueurs de **Texas Hold'em No Limit** en temps réel.

- **Frontend** : Vite + React + TypeScript + Tailwind CSS
- **Backend & temps réel** : [Convex](https://www.convex.dev/)
- **Évaluation des mains** : [`pokersolver`](https://www.npmjs.com/package/pokersolver)
- **Validation** : Zod

## Setup

```bash
npm install
npx convex dev   # configure / démarre le backend Convex (à faire une fois)
npm run dev      # démarre le front Vite
```

Variables d'environnement attendues dans `.env.local` (créées par
`npx convex dev`) : `VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`.

## Commandes

| Commande              | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Démarre le serveur de dev Vite           |
| `npm run build`       | Type-check + build de production         |
| `npm run preview`     | Prévisualise le build                    |
| `npm run lint`        | Lint TypeScript / React                  |
| `npm run typecheck`   | Vérification de types sans build         |
| `npm test`            | Lance la suite de tests Vitest           |
| `npm run test:poker`  | Tests d'intégrité du moteur poker        |
| `npm run test:coverage` | Tests + couverture                     |

## Structure

```
convex/        Logique serveur Convex (schema, auth, tables, moteur)
src/           Application React (core, shared, config)
tests/         Suite de tests Vitest
  └─ legacy/   Scripts et HTML de tests ad-hoc archivés
docs/          Documentation
  ├─ specs/    Cahier des charges, PRD, règles poker
  ├─ features/ Détails de fonctionnalités (short deck, side pots...)
  └─ history/  Rapports de corrections et de validation
public/        Assets statiques
```

Voir [`CLAUDE.md`](./CLAUDE.md) pour les instructions destinées à Claude Code,
[`docs/specs/cahier-des-charges.md`](./docs/specs/cahier-des-charges.md) pour
le cahier des charges et [`CHANGELOG.md`](./CHANGELOG.md) pour l'historique
des versions.
