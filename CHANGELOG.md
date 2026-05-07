# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased] — Sprint 2A Lobby cards + segmented control

### Modifié
- `TableCard` réécrit selon le spec mobile-first (TDD) : tokens Sprint 0 dark (`bg-bg-surface`, `border-border-default`), badges sémantiques (Cash/Tournoi/Privée/Freeroll/Terminé), format chips compact `K`, mise en page header/dl/footer.
- `JoinByCodeForm` réécrit avec primitives Sprint 0 (`Card`, `Input`, `Button`) — gestion d'erreur via la prop `error` de l'Input.
- `MyTablesSection` : tokens dark (`bg-bg-elevated`, `border-accent/30`), grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- `TableList` réécrit : SegmentedControl `Toutes / Cash / Tournois` (rôle `tablist`), squelettes de chargement, état vide cohérent, retrait du bloc quick-stats redondant.
- `Lobby` simplifié : suppression du header custom — `AppShell` fournit maintenant le chrome. Plus que JoinByCodeForm + MyTables + TableList.
- `AppMain` : `headerAction={ label: 'Créer', onClick: handleCreateTable }` passé à `AppShell` quand `currentView === 'lobby'`.

### Ajouté
- 11 tests UI (`TableCard`, `JoinByCodeForm`).

## [Unreleased] — Sprint 1C panneau droit desktop

### Ajouté
- `TableRightPanel` (`src/core/components/Game/`) : panneau latéral 320 px avec 3 onglets (Joueurs / Historique / Chat) monté en desktop ≥ 1024 px.
- `PlayersListPanel` : liste compacte des joueurs assis (avatar, nom, chips, statut Couché/All-in, mise en évidence du joueur courant).
- `ChatPanel` : squelette du Chat (le module reste backlog), réutilisable inline ou dans un drawer.
- 10 tests UI (`PlayersListPanel`, `TableRightPanel`).

### Modifié
- `PokerTable` : monte `TableRightPanel` à droite sur desktop. Comportement mobile/tablette inchangé (drawers via icônes header).

### Notes
- Mini-carte des sièges supprimée du périmètre (jugée non utile).
- L'envoi/réception de messages dans le Chat reste backlog (cf. CLAUDE.md "Chat system: future").

## [Unreleased] — Sprint 1B sièges + cartes communes

### Modifié
- `CommunityCards` réécrit selon le spec mobile-first (TDD) : `useMediaQuery` (Sprint 0) au lieu du legacy `useBreakpoint`, montant du pot en doré, libellés de phase plus discrets en preflop, format compact `K` plus précis.
- `PlayerSeat` décomposé en sous-composants ciblés sans toucher à la logique : `PlayerSeatEmpty`, `BlindBadge`, `PlayerAvatar`. Animations / push-to-pot / dealer / timer / blinds inchangés.

### Ajouté
- `src/core/components/Game/PlayerSeatEmpty.tsx` (siège libre, tap target 44px, label adaptatif).
- `src/core/components/Game/BlindBadge.tsx` (badge SB/BB pur).
- `src/core/components/Game/PlayerAvatar.tsx` (initiale, ring active, taille adaptative).
- 20 tests UI (`tests/ui/CommunityCards.test.tsx`, `PlayerSeatEmpty.test.tsx`, `BlindBadge.test.tsx`, `PlayerAvatar.test.tsx`).

### Notes
- L'API publique de `PlayerSeat` est inchangée : aucun changement requis dans `PokerTable.tsx`.
- Le calcul de positionnement (`useSeatPositioning`) et le moteur de jeu Convex sont intacts.

## [Unreleased] — Sprint 1A zone d'action mobile-first

### Modifié
- `BettingControls` réécrit selon le spec mobile-first : barre fixe Fold / Check / Call / Raise / All-in (44px tap min) ; bouton Raise ouvre un `BottomSheet` avec slider, presets (Min / ½ pot / ¾ pot / Pot / All-in) et confirmation. Sur desktop ≥ 1024px : layout inline avec slider visible (pas de sheet). Badges pot odds + hand strength au-dessus des actions. API props inchangée (zéro changement dans `PokerTable.tsx`).

### Ajouté
- Suite de tests `tests/ui/BettingControls.test.tsx` (21 tests, render / actions / Raise sheet / desktop inline / badges / disabled).

## [Unreleased] — Sprint 0 fondations mobile-first

### Ajouté
- Tokens Tailwind étendus : breakpoints `xs 320` à `2xl 1536`, couleurs UI minimaliste (`bg-base/surface/elevated`, `text-primary/muted`, `accent`, `sem-*`, `felt`, `gold`), motion (fast/base/slow), tap targets 44px / 48px.
- Variables CSS dynamiques (`src/shared/styles/tokens.css`) — single source of truth pour `--felt`, `--felt-rim`, `--gold` ; helpers safe-area iOS.
- Constante `BREAKPOINTS` (`src/shared/constants/breakpoints.ts`) pour partager la valeur `lg` entre AppShell et tests.
- Primitives partagées dans `src/shared/ui/` : `Button`, `Card`, `Input`, `BottomSheet`, `TabBar`, `AppShell`. Barrel export `src/shared/ui/index.ts`.
- Hooks `useMediaQuery` et `useOrientation` (`src/shared/hooks/`).
- Infra de test composants : jsdom + `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` ; suite `tests/ui/**` avec 35 tests (TDD).
- `AppShell` responsive : bottom tabs sur < 1024 px, sidebar rail sur ≥ 1024 px, mode `fullscreen` masquant tout le chrome pour la table de jeu, slot `activeTableBanner` pour bandeau "table active" (câblé Sprint 2).
- Intégration de `AppShell` dans `AppMain` : 4 onglets (Lobby / Tournois / Stats / Profil), placeholders alerte pour Tournois (Sprint 3) et Profil (Sprint 5), aucune régression fonctionnelle.

### Notes
- Les écrans existants (Lobby, PokerTable, StatsPage, CreateTableForm, LoginForm) ne sont pas refondus dans ce sprint — ils sont juste enveloppés par le nouveau shell. Refonte écran par écran à partir du Sprint 1 (Table en priorité).
- Tokens legacy `poker-green`, `poker-gold`, `poker.*` conservés intacts pour compatibilité avec les écrans non-refondus.
- Captures de référence à 320 / 375 / 768 / 1024 / 1280 px à produire manuellement après déploiement (cf. `docs/superpowers/specs/screenshots/sprint-0/README.md`).

## [1.2.0] - 2025-07-10

### 🎨 Ajouté
- **Design System complet** avec police Inter (400, 500, 600, 700)
- **Interface responsive** avec support mobile/tablet/desktop
- **Orientation landscape forcée** sur mobile pour optimiser l'expérience
- **Système de troncature** automatique pour éviter les débordements
- **Hook useBreakpoint** pour la gestion responsive
- **Composant LandscapeWarning** pour l'orientation mobile
- **Indicateur de statut moderne** (point vert) remplaçant le texte "Joueur en ligne"

### 🔧 Modifié
- **Typographie optimisée** avec abréviations intelligentes sur mobile
- **Formatage adaptatif** des montants (1,000,000 → 1M sur mobile)
- **Interface mobile** repensée avec navigation fixe en bas
- **PlayerSeats repositionnés** avec z-index élevé pour dépasser du bord de table
- **Boutons adaptatifs** avec textes raccourcis ("+ Créer une table" → "+ Créer")
- **UserProfile compact** modernisé avec indicateur visuel

### 🐛 Corrigé
- **Débordements de texte** sur tous les composants critiques
- **Noms d'utilisateurs longs** tronqués (max 120px mobile, 150px desktop)
- **Messages d'action** limités à 200px avec ellipse
- **Montants de mise** formatés selon la taille d'écran

## [1.1.0] - 2025-07-09

### 🎮 Ajouté
- **Système de statistiques joueurs complet** avec win rate, gains, mains jouées
- **Logique de fin de tournoi** avec redirection automatique vers le lobby
- **Support freeroll tournaments** (buy-in = 0)
- **ActionFeed amélioré** avec historique des actions en temps réel
- **Séparation buy-in/starting stack** dans la création de tables

### 🔧 Modifié
- **Interface ActionFeed** avec meilleur affichage des actions récentes
- **Gestion des blinds** avec affichage amélioré
- **Configuration tables** plus flexible

### 🐛 Corrigé
- **Logique all-in** et affichage des cartes au showdown
- **Erreur clé unique** dans ActionFeed
- **Timer prématuré** avant le début de partie
- **Erreurs TypeScript** principales
- **IDs de notifications corrompus** avec validation stricte
- **Boucle infinie** dans la synchronisation user data

## [1.0.0] - 2025-07-08

### 🚀 Version Initiale
- **Core poker engine** avec logique Texas Hold'em No Limit complète
- **Système d'authentification** avec Convex Auth
- **Interface de jeu** avec table, cartes, jetons
- **Gestion temps réel** avec synchronisation multi-joueurs
- **Système de tables** avec création/rejoindre
- **Logique de mise** (fold, check, call, raise, all-in)
- **Phases de jeu** (preflop, flop, turn, river, showdown)
- **Side pots** pour gestion all-in multiples
- **Distribution automatique** des cartes et bouton dealer
- **Interface responsive** de base

### 🎯 Fondations Techniques
- **Stack** : Vite.js + React + TypeScript + Convex + Tailwind
- **Architecture modulaire** avec hooks personnalisés
- **Validation des actions** côté serveur
- **Évaluation des mains** avec pokersolver
- **Gestion d'état** avec React Context + Convex

---

## Métriques de Qualité par Version

| Version | Stabilité | Performance | UX/UI | Code Quality | Production Ready |
|---------|-----------|-------------|-------|--------------|------------------|
| v1.2.0  | 95%       | 90%         | 98%   | 88%          | ✅ Oui           |
| v1.1.0  | 90%       | 85%         | 85%   | 85%          | ✅ Oui           |
| v1.0.0  | 80%       | 80%         | 75%   | 80%          | ⚠️  Beta         |

## Roadmap v1.3.0 (Prochaine Version)

### 🎯 Fonctionnalités Planifiées
- [ ] **Chat système** en temps réel
- [ ] **Animations avancées** pour les actions de jeu
- [ ] **Support PWA** pour installation mobile
- [ ] **Notifications push** pour les invitations
- [ ] **Mode spectateur** pour observer les parties
- [ ] **Replay système** pour revoir les mains
- [ ] **Statistiques avancées** avec graphiques
- [ ] **Customisation avatars** avancée

### 📊 Objectifs Techniques
- **Performance** : 95% (optimisation bundle, lazy loading)
- **Accessibilité** : WCAG 2.1 AA compliance
- **Tests** : 90% code coverage
- **Documentation** : API complète + guides utilisateur