# Refonte mobile-first — Design spec

**Date** : 2026-05-06
**Auteur** : satch9 (Vincent) + Claude
**Statut** : à valider

## Vision

Refondre l'application Texas Hold'em pour qu'elle soit aussi confortable à utiliser sur un iPhone SE tenu à une main qu'à un MacBook 15", avec la table de poker comme cœur de l'expérience. Le mobile devient la base de conception, tablette et desktop en sont des dérivations enrichies (pas l'inverse).

## Objectifs

- Tous les écrans (Lobby, Table, Tournois, Stats, Profil, Auth, Invitations) sont **pleinement utilisables** sur smartphones de 320 px à desktops 1536+ px.
- La **table de jeu** (pain point #1) devient confortable au pouce : zones tactiles ≥ 44 px, action toujours accessible, lisibilité préservée jusqu'à 320 px.
- **Cohérence visuelle** garantie par un design system minimal (tokens + primitives partagées).
- **Tablette et desktop** exploitent leurs grands écrans (multi-panneaux, sidebar permanente, panneau chat/historique sur la table) sans rupture conceptuelle avec mobile.

## Non-objectifs

- Pas de refonte des règles de jeu, du moteur poker, du schéma Convex, de l'authentification fonctionnelle, ni des modules backend (gameEngine, tournaments, invitations côté logique). Cette refonte est **front-end only** (UI/UX).
- Pas de migration vers un autre framework (on reste Vite + React + Tailwind).
- Pas de support des navigateurs obsolètes (IE, Safari < 15, Chrome < 100).
- Pas de mode hors-ligne (le jeu temps-réel l'exclut).
- Pas de PWA / app native dans le périmètre de cette refonte (peut suivre).
- Pas de chat à la table dans cette refonte (le panneau desktop prévoit l'emplacement, mais le module chat reste en backlog conformément au CLAUDE.md).

## Principes directeurs

1. **Mobile-first strict** — chaque écran est conçu pour 320 px d'abord, puis enrichi.
2. **Zones tactiles confortables** — taille minimale 44 × 44 px, espacement minimal 8 px.
3. **Cohérence globale, immersion à la table** — UI minimaliste partout, sauf la table qui garde une identité "feutre poker".
4. **Pouce d'abord** — actions primaires dans la zone basse, accessible au pouce.
5. **Densité progressive** — mobile : une chose à la fois ; tablette : deux panneaux ; desktop : tableau de bord.
6. **Orientation adaptative pour la table seulement** — le reste de l'app reste en portrait.
7. **Performance ressentie** — transitions ≤ 200 ms, squelettes plutôt que spinners.
8. **Accessibilité** — contraste WCAG AA, focus visible, `prefers-reduced-motion` respecté.

## Design tokens

### Breakpoints (mobile-first, min-width)

| Nom | Largeur | Cible | Layout |
|---|---|---|---|
| `xs` | 320 px | iPhone SE 1, vieux Android | base, 1 colonne, bottom tabs |
| `sm` | 375 px | iPhone moderne standard | base enrichie |
| `md` | 768 px | tablette portrait | 1–2 colonnes, bottom tabs |
| `lg` | 1024 px | tablette paysage / petit laptop | sidebar permanente |
| `xl` | 1280 px | desktop | tableau de bord complet |
| `2xl` | 1536 px | desktop large | mêmes layouts, max-width contenue |

### Espacements

Échelle 4 px : `0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px)`.

### Typographie

- Tailles : `xs 12, sm 14, base 16, lg 18, xl 20, 2xl 24, 3xl 30, 4xl 36` (px).
- Police principale : **Inter**.
- Police accent table : **Bebas Neue** (pot, blinds, valeurs de mise).

### Couleurs (mode sombre)

**UI globale (minimaliste)** :
- `bg-base #0B0F14`, `bg-surface #151B23`, `bg-elevated #1E2630`
- `text-primary #E6EDF3`, `text-muted #8B98A8`, `border #2A3340`

**Accent et sémantiques** :
- Primaire `#3B82F6` (bleu) — actions UI.
- `success #10B981`, `danger #EF4444` (fold), `warning #F59E0B`, `info #06B6D4`.

**Table immersive** :
- `felt #0F4C3A`, `felt-rim #1A2E26`, `gold #D4AF37` (pot, mises), `card-back #1B3A6E`.

### Cibles tactiles

`tap-min 44 px`, `tap-comfort 48 px`.

### Rayons

`rounded-sm 4px`, `rounded 8px`, `rounded-lg 12px`, `rounded-xl 16px`, `rounded-full`.

### Élévations

4 niveaux : `none`, `card` (subtil), `floating` (modals/sheets), `overlay` (max).

### Motion

Durées `fast 120ms`, `base 200ms`, `slow 320ms`. Easing `ease-out` par défaut, `ease-in-out` pour les transitions réversibles. Respect strict de `prefers-reduced-motion: reduce` (animations remplacées par fondu instantané).

### Implémentation

Tokens exposés via `tailwind.config.js` (extension du thème). Les valeurs dynamiques (feutre table) passent par variables CSS sur `:root` et un wrapper `.theme-felt` à l'écran de table.

## Architecture de navigation

### Mobile (`xs`–`md`, < 1024 px)

- **Top header** (44 px + safe area) : titre de l'écran + 1 action contextuelle max + cloche notifications (badge si invitations reçues).
- **Bottom tab bar** (56 px + safe area) : 4 onglets — **Lobby / Tournois / Stats / Profil**. Icône + label.
- **Sur la table de jeu** : header et bottom tab bar **masqués**, table plein écran, chevron retour discret en haut.

### Tablette paysage / petit laptop (`lg`, 1024–1279 px)

- **Sidebar gauche permanente** (rail 72 px, icônes seules + tooltip), bottom tabs supprimées.
- **Top bar globale** : logo + recherche + profil/notifications.
- 2–3 colonnes selon l'écran.
- Table : sidebar masquée, panneau droit `Chat` / `Historique main` / `Joueurs`.

### Desktop (`xl`+, ≥ 1280 px)

- **Sidebar étendue** (240 px, icône + label).
- Layouts multi-panneaux (filtres / liste / détail).

### Bandeau "table active"

Si l'utilisateur a une table en cours hors écran de table, un **bandeau persistant** s'affiche en haut de tous les autres écrans : *"Tu joues à : Cash #12 — Tour de Vincent — 0:15s"*, tapable. Sur `lg+`, il devient un widget en sidebar.

### Invitations

Les invitations reçues sont accessibles via :
- Badge sur l'onglet Lobby + cloche dans le header (centre de notifications mobile, popover sur desktop).
- Bottom sheet (mobile) ou panneau (desktop) listant invitations avec accept/decline inline.
- Création/envoi : dans le détail d'une table (Lobby).

## Écrans

### Table de jeu

#### Mobile portrait

- Mini bar (32 px) : chevron retour, titre, info, indicateur joueurs.
- Sièges adversaires en arc (haut/côtés), avatars 32 px sur 320 px, jusqu'à 8 adversaires.
- Bloc central : pot (Bebas Neue, doré), cartes communes (36 × 50 px), info tour ("Tour de Marc — 0:18").
- Zone joueur (toi) en bas centre : avatar + stack + 2 cartes hole (44 × 60 px).
- **Zone d'action fixe** (toujours visible, hauteur 56 px) :
  - 3 boutons : `Fold` (rouge), `Call X` ou `Check` (bleu), `Raise` (or).
  - Tap sur `Raise` → BottomSheet (~320 px) avec slider, presets (`Min`, `½ pot`, `¾ pot`, `Pot`, `All-in`), champ numérique, `Annuler` / `Confirmer`.
  - Si pas son tour : zone neutralisée affichant "Tour de X — chrono" et bouton `Quitter` discret.
- Indicateur de tour : timer circulaire autour de l'avatar du joueur courant.

#### Mobile paysage

Layout poker classique : sièges en ovale autour d'un feutre, joueur en bas, action en bas à droite, sheet Raise glisse vers le haut. Header masqué, swipe-down pour quitter.

#### Tablette (`md`)

Layout paysage par défaut, avatars 48–56 px, cartes 48 × 68 px, mini-historique 3 actions en haut à droite.

#### Desktop (`lg`+)

Table centrée (max 900 px), panneau droit 320 px à onglets `Chat` / `Historique main` / `Joueurs`. Mini-carte des sièges en haut à gauche. Slider Raise inline (pas de sheet).

#### Animations

Distribution cartes (slide depuis dealer, 200 ms), tournage flop/turn/river (flip 320 ms), bet vers pot (slide 200 ms). Toutes neutralisées si `prefers-reduced-motion`.

### Lobby

#### Mobile portrait

- Header : titre, cloche, bouton `+` (créer une table).
- SegmentedControl : `Cash` / `Tournois` / `Invitations reçues`.
- Liste de cards (1 par ligne, ~96 px) : nom, blinds, stack moyen, joueurs/max, type ; actions `Rejoindre` + `Détails`.
- Pull-to-refresh, état vide avec CTA, chargement squelette.
- `+` → BottomSheet `Créer une table` (sections collapsibles : type, blinds, sièges, privée/publique, invitations).

#### Tablette / desktop

Tablette : 2 colonnes (liste + détail). Desktop : 3 colonnes (filtres / liste / détail) avec bouton créer inline.

### Tournois

#### Mobile portrait

- SegmentedControl : `À venir` / `En cours` / `Historique`.
- Cards : nom, format (SNG MVP, MTT en backlog), buy-in, sièges, état (compte à rebours / en cours / fini), action primaire.
- Détail (tap) : infos, structure blinds compacte scrollable, inscrits (avatars), historique mains si en cours, action `S'inscrire` / `Rejoindre`.
- `+` → BottomSheet `Créer un tournoi` avec calculateur de structure auto (durée cible, intervalle, joueurs, buy-in).
- Tournoi en cours : bouton `Reprendre` ouvre la table.

#### Tablette / desktop

Tablette : 2 colonnes. Desktop : 3 colonnes avec timeline visuelle des niveaux à venir.

### Stats

#### Mobile portrait

- SegmentedControl : `7j` / `30j` / `90j` / `Tout`.
- Cards : Résumé (mains jouées, bilan, VPIP, PFR), Évolution stack (graphique), Mains récentes (liste tappable).
- Tap sur main → détail / replay (cartes communes successives, actions par joueur, navigable ◀ ▶).
- Bouton `Exporter` dans header (CSV/JSON) — préparation utilisation IA future (mémoire projet).

#### Tablette / desktop

Tablette : 2 colonnes. Desktop : 3 panneaux avec replay inline.

#### Lib graphique

**recharts** — déclaratif React, courbe d'apprentissage faible, taille raisonnable, suffisant pour les graphiques prévus (évolution stack, distribution résultats).

### Profil

#### Mobile portrait

- Header utilisateur : avatar 80 px + pseudo + email.
- Cards groupées par catégorie :
  - **Préférences** : thème, notifications, animations, sons.
  - **Compte** : email, mot de passe, données / export.
  - **App** : à propos, aide, déconnexion (rouge).
- Items 56 px de haut, chevron à droite, tap → écran enfant ou BottomSheet.

#### Tablette / desktop

2 colonnes (catégories à gauche, détail à droite). Desktop : intégré à la sidebar permanente.

### Auth & Onboarding

#### Mobile portrait

- Accueil non connecté : logo + tagline + 2 CTA (`Se connecter` / `Créer un compte`) + lien discret "Saisir un code d'invitation".
- Connexion : email + mot de passe + bouton primaire 56 px + lien "Mot de passe oublié". Scroll auto pour éviter que le clavier couvre le bouton.
- Inscription : étapes courtes (email → mot de passe → pseudo → confirmation) avec barre de progression.
- Acceptation par lien : écran "Tu es invité à *Cash #12*" → CTA `Accepter` qui pousse vers connexion ou inscription.

#### Tablette / desktop

Formulaires centrés (max-width 480 px), illustrations latérales optionnelles.

## Composants atomiques (design system minimal)

Localisation : `src/shared/ui/`.

| Composant | Sprint | Mobile | Tablette | Desktop |
|---|---|---|---|---|
| `Button` (variants : primary, secondary, danger, ghost ; sizes : sm, md, lg) | 0 | x | x | x |
| `BottomSheet` (avec drag handle) | 0 | x | x | dialog |
| `TabBar` (bottom mobile, sidebar `lg+`) | 0 | x | x | x |
| `Card` | 0 | x | x | x |
| `Input` (text, number, password) | 0 | x | x | x |
| `Slider` (mise) | 1 | x | x | x |
| `SegmentedControl` | 1 | x | x | x |
| `Avatar` | 1 | x | x | x |
| `PlayingCard` | 1 | x | x | x |
| `Sheet` latéral (panneau droit desktop) | 1 | — | — | x |
| `Modal` | 2 | x | x | x |
| `Toast` / `Snackbar` | 2 | x | x | x |
| `Skeleton` | 2 | x | x | x |
| `EmptyState` | 2 | x | x | x |

### Hook utilitaire

`useOrientation()` — retourne `'portrait' | 'landscape'`, basé sur `matchMedia('(orientation: landscape)')`. Utilisé par la Table.

## Architecture front

- **AppShell** (`src/core/components/App/AppShell.tsx`) : gère bottom tabs (`xs`–`md`), sidebar (`lg+`), top header contextuel, safe areas, bandeau "table active".
- Route `/table/:id` : monte `TableScreen` qui demande au shell de masquer header + tabs.
- `src/shared/ui/` : primitives + tokens.
- `src/shared/styles/tokens.css` : variables CSS (couleurs feutre dynamiques).
- `tailwind.config.js` étendu (breakpoints, espacements, couleurs, typo, durées).

## Plan d'exécution

### Sprint 0 — Fondations (3–4 jours)

- Étendre `tailwind.config.js` (breakpoints, tokens).
- `src/shared/ui/` avec primitives P0 : `Button`, `BottomSheet`, `Card`, `Input`, `TabBar`.
- `AppShell` responsive (bottom tabs ↔ sidebar, top header, safe areas, bandeau table active).
- `useOrientation`.
- Régression : les écrans existants continuent de fonctionner via le nouveau shell.

**Done quand** : commit, déploiement, AppShell visible sans casser l'existant.

### Sprint 1 — Refonte Table (1–1,5 semaine)

- Refonte `src/core/components/Table` selon spec.
- Implémenter `PlayingCard`, `Slider`, `SegmentedControl`, `Avatar`.
- Layout portrait + paysage adaptatif.
- Zone d'action fixe + BottomSheet Raise.
- Animations distribution / pot / tournage cartes (avec `prefers-reduced-motion`).
- Dérivations tablette + desktop (panneau droit `lg+`).
- Tests matrice 320 / 375 / 414 / 768 / 1024 / 1280 px en portrait et paysage.

### Sprint 2 — Refonte Lobby + bandeau table active (1 semaine)

- Lobby selon spec.
- BottomSheet "Créer une table", BottomSheet "Notifications/Invitations".
- Brancher bandeau persistant.
- Pull-to-refresh, états vides, squelettes.
- Dérivations tablette/desktop.

### Sprint 3 — Refonte Tournois (1 semaine)

- Liste, détail, structure blinds (compacte mobile, étendue desktop).
- BottomSheet "Créer un tournoi" + calculateur de structure.
- Dérivations tablette/desktop.

### Sprint 4 — Refonte Stats (1 semaine)

- Cards résumé + graphique (recharts) + liste mains.
- Replay main.
- Bouton export CSV/JSON.
- Dérivations tablette/desktop.

### Sprint 5 — Refonte Profil + Auth/Onboarding + acceptation invitations (3–5 jours)

- Profil cards groupées.
- Auth : connexion, inscription en étapes, gestion clavier.
- Flow d'acceptation d'invitation par lien.

### Sprint 6 — Polish, accessibilité, perf (3–5 jours)

- Audit accessibilité (contraste WCAG AA, focus, lecteurs d'écran).
- Audit perf (Lighthouse mobile, taille bundle, lazy load des écrans non critiques).
- Captures de référence sur la matrice de breakpoints.
- Finalisation `Toast`, `Skeleton`, `EmptyState`, `Modal`.
- Lock d'orientation hors table.

### Critères de "Done" par sprint

- Captures sur 320 / 375 / 768 / 1024 / 1280 px (et paysage pour la table).
- Pas de régression fonctionnelle (les parties peuvent toujours se jouer).
- Tests manuels validés sur la matrice de breakpoints.
- Commit dédié par étape (cf. CLAUDE.md).

## Risques & mitigations

- **Régressions de jeu pendant la refonte UI** → règle stricte : tout sprint doit livrer une app fonctionnellement équivalente. CI manuel : ouvrir une table, jouer un coup, vérifier le synchro.
- **Performance recharts sur mobile bas de gamme** → import dynamique de la page Stats (lazy), graphiques hors viewport non rendus.
- **BottomSheet et clavier mobile (auth, créer table)** → tester en early sprint 0, prévoir `visualViewport` API pour ajuster.
- **Animations table coûteuses** → `transform`/`opacity` uniquement, pas de `top/left`. `will-change` ciblé. `prefers-reduced-motion` strict.
- **Compatibilité 320 px** → tester systématiquement à cette largeur sur chaque sprint, pas seulement à la fin.

## Estimation totale

~6–7 semaines à plein temps, ou ~10–12 semaines en rythme soutenable.

## Références projet

- Mémoire projet : SNG single-table prioritaire pour MVP, MTT en backlog ; pas de late reg / rebuy au MVP ; page `/stats` dédiée car données serviront à entraîner une IA plus tard.
- CLAUDE.md : phases MVP / Extended / Polish, modules optionnels via configuration, validation server-side, sécurité des cartes privées.
- App déployée : https://home-poker.vjdev.tech/
