# Spec — Audit fonctionnel 0.B

**Date** : 2026-05-04
**Phase** : 0.B (recherche, pas d'implémentation côté code applicatif)
**Phase précédente** : 1.A (fix technique, terminée — typecheck/lint/test verts)
**Phase suivante** : 1.B (fix fonctionnel, sera planifiée à partir du rapport produit ici)

## Contexte

Avec 1.A clôturée, le repo est techniquement sain : compilation, lint et tests existants passent. Mais "ça compile" ≠ "ça joue". L'objectif de 0.B est de vérifier que **les parcours utilisateur du MVP heads-up se déroulent correctement de bout en bout**, et d'identifier les bugs fonctionnels (logique, états, UI désynchronisée) avant de les corriger en 1.B.

## Objectif

Produire un rapport priorisé des bugs fonctionnels et des incohérences entre code/UX/règles du poker, suffisamment détaillé pour que le plan **1.B** soit écrit sans nouvelle investigation.

**Critère de sortie** : une partie heads-up complète peut se dérouler du préflop au showdown avec dealer button qui tourne sur plusieurs mains et gestion correcte de l'élimination — après application des fixes recommandés.

## Méthode — hybride

L'audit fonctionnel combine 3 approches complémentaires.

### 1. Audit statique des parcours (sub-agents Explore)
Lecture du code des chemins critiques pour identifier :
- Mutations Convex appelées depuis chaque action utilisateur
- États intermédiaires (`table.status`, `gameState.phase`, `players.lastAction`, `players.hasActed`, `players.isFolded`, `players.isAllIn`)
- Race conditions potentielles
- Cas non gérés (`undefined`, fallback manquant, query qui ne déclenche pas)
- Validation serveur manquante
- Désynchronisations probables UI ↔ backend

### 2. Smoke tests manuels guidés (utilisateur)
Une checklist exécutée par le user dans le navigateur, avec 2 sessions (normale + privée) pour simuler 2 joueurs. Couverture des 6 parcours MVP.

### 3. Scénarios multi-joueurs scriptés (harness Convex)
Un script Node jetable qui pilote le déploiement Convex dev pour reproduire 3 scénarios précis difficiles à tester manuellement (ordering 4-way, side pots 3-way, élimination en cours de main).

## Périmètre

### Parcours MVP heads-up (audit statique + smoke manuel)

1. **Auth** — signup, signin, persist session après refresh, signout
2. **Création table** — cash game, 2 joueurs max, paramètres blindes, code d'invitation généré
3. **Rejoindre table** — par code (le 2e joueur)
4. **Partie heads-up complète** — pose des blindes (SB/BB selon dealer button), distribution cartes, pré-flop → flop → turn → river → showdown, détermination du gagnant via `handEvaluator`, distribution du pot
5. **Plusieurs mains consécutives** — rotation du dealer button, gestion de l'all-in, gestion de l'élimination
6. **Sortir de la table** — départ propre, états cohérents pour le joueur restant

### Scénarios multi-joueurs ciblés (harness)

- **S1 — Action ordering 4 joueurs** : pré-flop UTG → CO → SB → BB ; post-flop SB → BB → UTG → CO. Vérifier que `currentPlayerPosition` avance correctement et que `lastRaiserPosition` clôture le tour au bon moment.
- **S2 — Side pots 3-way** : 3 joueurs all-in à montants différents (A=100, B=50, C=200). Vérifier la création des 2 side pots et que les éligibilités sont correctes au showdown.
- **S3 — Élimination en cours de main** : 3 joueurs, A perd tout au flop (passe à 0 chips), B et C continuent jusqu'au showdown ; vérifier que A n'est pas reconvoqué pour agir et que la main suivante démarre bien à 2.

### Hors-scope

- ❌ Tournois (phase ultérieure)
- ❌ Système d'invitation par email (Phase 2 Module A)
- ❌ Tests automatisés pérennes (Lot tests dédié)
- ❌ Sécurité (S1/S2/S3 du rapport 0.A → phase 0.C)
- ❌ Performance / latence
- ❌ Tables 7-9 joueurs

## Composants livrables

### A. Rapport d'audit
**Chemin** : `docs/superpowers/specs/2026-05-04-audit-fonctionnel-rapport.md`

**Structure** :
1. Métadonnées (date, branche, commit, déploiement Convex utilisé)
2. Résumé exécutif (verdict 🟢/🟡/🔴, total findings par sévérité)
3. Findings par parcours :
   - **Parcours 1 — Auth** (B1.x)
   - **Parcours 2 — Création table** (B2.x)
   - **Parcours 3 — Rejoindre table** (B3.x)
   - **Parcours 4 — Partie heads-up** (B4.x)
   - **Parcours 5 — Multi-mains / élimination** (B5.x)
   - **Parcours 6 — Sortir de la table** (B6.x)
4. Findings multi-joueurs (B7.S1.x, B7.S2.x, B7.S3.x)
5. Tableau récapitulatif trié par sévérité
6. Recommandations pour 1.B (lots)

**Format finding** identique à 0.A :
```
#### B{parcours}.{n} — {Titre}
- Sévérité : 🔴 | 🟡 | 🟢
- Localisation : `fichier:ligne` et/ou parcours UI
- Description : 1-3 phrases
- Reproduction : étapes pour reproduire (smoke ou harness)
- Recommandation : action concrète
```

### B. Checklist de smoke tests
**Chemin** : `docs/superpowers/specs/2026-05-04-audit-fonctionnel-checklist.md`

Document que le user suit dans son navigateur. Sections :
- Setup (terminaux, comptes test, sessions navigateur)
- 30-45 cases à cocher avec champs "✅ / ⚠️ / ❌ + note"
- Espace pour copier-coller le résultat dans la conversation

### C. Harness multi-joueurs
**Chemin** : `tests/legacy/audit-harness.mjs` (`tests/legacy/` car script jetable, pas un test pérenne)

Caractéristiques :
- Module ESM Node 20+
- Utilise le client Convex officiel (`convex/browser` côté Node) avec l'URL `https://incredible-hedgehog-551.convex.cloud`
- Crée 4 users de test (`audit-bot-1@local` à `audit-bot-4@local`)
- Crée une table dédiée
- Place les bots en sièges
- Pour chaque scénario S1/S2/S3 : déclenche la séquence d'actions, logue les états après chaque mutation, vérifie des assertions soft (warning si décalage avec attendu, pas un crash)
- README court : commande de lancement, déploiement attendu, comment nettoyer les données après run

### D. Sévérités (alignées avec 0.A)
- 🔴 **bloquant** : empêche de jouer une partie heads-up complète
- 🟡 **dégradé** : la partie se joue mais comportement incorrect ou désagréable
- 🟢 **cosmétique** : visuel/UX mineur

## Exécution

| Étape | Acteur | Durée estimée |
|---|---|---|
| 1. Audit statique des 6 parcours via sub-agents Explore | Agent principal | ~20 min |
| 2. Rédaction de la checklist smoke tests | Agent principal | ~10 min |
| 3. Construction du harness (script Node) | Agent principal | ~45 min |
| 4. Exécution de la checklist par le user | **User** + remontée des résultats | 30-45 min |
| 5. Exécution du harness par l'agent | Agent principal | ~10 min |
| 6. Consolidation du rapport | Agent principal | ~15 min |

### Prérequis pour étape 4
- `npx convex dev` lancé dans un terminal (déploiement `incredible-hedgehog-551`)
- `npm run dev` lancé dans un autre terminal
- 2 sessions navigateur (normale + navigation privée) pour les 2 joueurs

## Risques

- **R1** — `npx convex dev` casse au démarrage (schema/code obsolète post-1.A) : ne devrait pas arriver vu que typecheck est vert, mais si ça arrive, escalade et fix avant de continuer.
- **R2** — Le harness échoue à se connecter / s'auth (mutation `signUpWithPassword` modifiée par 1.A, ou flow auth nouveau) : fallback sur tests manuels multi-onglets pour S1/S2/S3.
- **R3** — Trop de findings 🔴 (> 15) : stop au premier ou aux 3 premiers blocants, planifier 1.B immédiatement plutôt que de tout cataloguer (visibilité avant exhaustivité).
- **R4** — La checklist est trop longue pour le user : si > 60 min de clics, j'ajuste à mi-parcours en réduisant les variantes.

## Hypothèses

- **H1** — Le déploiement Convex dev `incredible-hedgehog-551` est utilisable sans réinitialiser les données. Sinon, le harness inclut un nettoyage en début de run.
- **H2** — Les fixes de 1.A n'ont pas régressé un parcours fonctionnel. Si la checklist révèle un parcours cassé qui marchait avant 1.A, c'est une régression à signaler en priorité.

## Suite

Une fois le rapport validé par le user, invoquer `superpowers:brainstorming` pour la phase **1.B (fix fonctionnel)**.
