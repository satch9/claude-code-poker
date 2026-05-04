# tests/legacy

Scripts et pages HTML de test ad-hoc utilisés pendant le développement
des phases 1 et 2. Conservés à titre d'historique et de référence.

- `scripts/` : scripts Node (`.js`, `.mjs`) — validations manuelles de la
  logique poker (rotation dealer, blinds, side pots, hand evaluation,
  short deck, intégration pokersolver).
- `html/` : pages HTML autonomes pour tester visuellement des
  composants ou scénarios (ordre d'action, animations, règles de mise,
  side pots, interface table, gestion des tours...).

Ces fichiers ne sont **pas** lancés par `npm test`. La suite officielle
est dans `tests/` (voir `tests/poker-integrity.test.js`).
