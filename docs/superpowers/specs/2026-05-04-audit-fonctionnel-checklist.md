# Checklist Smoke Tests — Audit Fonctionnel 0.B

**Objectif** : exécuter les 6 parcours MVP heads-up dans le navigateur et
remonter les anomalies. Durée estimée : 30-45 min.

## Setup (à faire une fois)

1. Terminal 1 : `npx convex dev` (laisser tourner)
2. Terminal 2 : `npm run dev` (laisser tourner, ouvrir l'URL affichée)
3. Navigateur : ouvrir l'URL en session normale **et** en navigation privée.
   Tu joueras Joueur A en normal, Joueur B en privé.

## Format des réponses

Pour chaque case, mets un statut + note courte si anomalie :
- ✅ ok
- ⚠️ glitch : brève description
- ❌ cassé : brève description

À la fin, copie-colle ce document rempli dans la conversation.

---

## Parcours 1 — Auth

- [x] **1.1** Joueur A : signup avec un email neuf et un nom → arrive sur l'app loggé. Statut : ✅ ok (testé sur https://home-poker.vjdev.tech avec viny1976@gmail.com après suppression du compte préexistant)
- [x] **1.2** Joueur A : refresh la page (F5) → la session persiste. Statut : ✅ ok
- [x] **1.3** Joueur A : signout → retour à l'écran de connexion. Statut : ✅ ok
- [x] **1.4** Joueur A : signin avec les credentials créés en 1.1 → loggé. Statut : ✅ ok
- [x] **1.5** Joueur A : signin avec un mauvais mot de passe → message d'erreur clair. Statut : ❌ aucun message UI affiché ; erreur seulement en console (`auth:signInWithPassword Invalid email or password` à `convex/auth.ts:61`). Confirme **B1.4**.
- [x] **1.6** Joueur A : signup avec un email déjà utilisé → message d'erreur clair. Statut : ❌ aucun message UI clair ; erreur seulement en console (`auth:signUpWithPassword User already exists with this email` à `convex/auth.ts:22`). Confirme **B1.4**.
- [x] **1.7** Joueur B (session privée) : signup avec un autre email → loggé en parallèle de A. Statut : ✅ ok

## Parcours 2 — Création table

- [x] **2.1** Joueur A : créer une table cash, 2 joueurs max, blindes 5/10, stack 1000, privée → table créée. Statut : ✅ ok
- [x] **2.2** Le code d'invitation est affiché clairement et copiable. Statut : ❌ code non affiché ou non copiable. Couplé avec **B3.1** (parcours rejoindre par code non implémenté), le code est inutile actuellement.
- [x] **2.3** A est automatiquement assis à un siège (ou doit cliquer pour s'asseoir ?). Statut : ⚠️ A n'est **pas** auto-assis (handleTableCreated ne fait pas joinTable, cf. **B2.4 statique**). Le clic sur "Siège libre" fonctionne en revanche. **Nouveau finding runtime B-runtime.1** : sur mobile (portrait et paysage), toute l'UI de la table est collée en haut de l'écran (CSS responsive cassé). Desktop OK.
- [x] **2.4** Champs invalides (smallBlind=0, maxPlayers=1) → bloqués ou message clair. Statut : ✅ ok (validation côté UI ; rappel **B2.1** : pas de validation serveur — le UI peut être contourné).

## Parcours 3 — Rejoindre table par code

- [x] **3.1** Joueur B : entrer le code reçu de A → arrive sur la table. Statut : ❌ parcours "rejoindre par code" non implémenté (confirme **B3.1**). Contournement : B a vu la table dans la liste du lobby (alors que `isPrivate: true` côté DB — la table privée s'affiche quand même publiquement, **nouveau finding B-runtime.2**) et a cliqué dessus pour s'asseoir.
- [x] **3.2** B est assis à un siège libre. Statut : ✅ ok (clic sur siège libre dans la table)
- [x] **3.3** A voit B arriver en temps réel (sans refresh). Statut : ✅ ok
- [ ] **3.4** Code invalide → erreur claire. Statut :
- [ ] **3.5** Casse de la casse (CODE en minuscules) → fonctionne ou message clair. Statut :

## Parcours 4 — Partie heads-up complète

- [x] **4.1** A (créateur) clique "démarrer" → la partie commence. Statut : ✅ ok (rappel: B-runtime.3 — bouton aussi visible à B)
- [x] **4.2** Les 2 joueurs voient leurs 2 cartes privées (l'un ne voit pas celles de l'autre). Statut : ✅ ok
- [ ] **4.3** Les blindes sont posées correctement (SB par dealer, BB par l'autre). Statut : à vérifier (en heads-up : dealer = SB, autre = BB)
- [x] **4.4** Préflop : SB doit agir en premier (heads-up). Statut : ✅ ok
- [x] **4.5** A peut call/fold/raise/all-in selon les options proposées. Statut : ✅ ok
- [x] **4.6** Après que les 2 ont agi, le flop apparaît (3 cartes communautaires). Statut : ✅ ok (à confirmer ultérieurement : pas de doublon entre cartes privées et communautaires — cf. **B4.1 statique**)
- [x] **4.7** Postflop : BB doit agir en premier (heads-up). Statut : ✅ ok
- [x] **4.8** Turn → river → showdown : les phases s'enchaînent correctement. Statut : ✅ ok
- [x] **4.9** Au showdown, les 2 mains sont révélées et le gagnant est désigné. Statut : ❌ **partage déclaré à tort** : Eliott (A 6) vs Satch9 (4 Q), board A 9 10 Q 10. Eliott a 2 paires AA+1010 kicker Q (meilleure paire haute), Satch9 a 2 paires QQ+1010 kicker A. Eliott devait gagner. **Nouveau finding B-runtime.5 🔴**.
- [x] **4.10** Le pot est crédité au gagnant correctement. Statut : ❌ Le système annonce "split" mais les jetons ne sont pas répartis également entre les 2 joueurs. Incohérence message UI vs distribution réelle. **Nouveau finding B-runtime.7 🔴**.

## Parcours 5 — Multi-mains et élimination

- [x] **5.1** Une fois la main 1 finie, la main 2 démarre (auto ou bouton). Statut : ✅ ok
- [x] **5.2** Le dealer button a tourné (rotation correcte heads-up). Statut : ✅ probable (à reconfirmer si possible)
- [x] **5.3** Les blindes sont posées par les bons joueurs cette fois. Statut : ✅ ok
- [x] **5.4** Les cartes sont redistribuées (différentes des précédentes). Statut : ✅ ok
- [x] **5.5** Faire une main avec un all-in : le perdant est éliminé ou reste à 0 ? Statut : ⚠️ le perdant reste à 0 jetons (confirme **B5.2**), et l'UI propose "Démarrer la partie" ou "Quitter la table". En cash game, aucune proposition de **rebuy** n'est faite. **Nouveau finding B-runtime.8 🟡**.
- [x] **5.6** Si élimination : message de fin / retour vers l'écran d'accueil ? Statut : ⚠️ comportement de tournoi appliqué à du cash. En cash game, on devrait proposer au joueur fauché de remettre des jetons (rebuy) plutôt que d'arrêter la partie. Couvert par B-runtime.8.

## Parcours 6 — Sortir de la table

- [ ] **6.1** Joueur B clique "Quitter" entre 2 mains → quitte proprement. Statut :
- [ ] **6.2** Joueur A voit le départ de B en temps réel. Statut :
- [ ] **6.3** A se retrouve seul → la table revient à un état "waiting" ou message ? Statut :
- [ ] **6.4** Joueur B se déconnecte au milieu d'une main (clic Quitter pendant un tour) → fold auto ? Statut :
- [ ] **6.5** Le créateur de la table quitte → table supprimée ? Conservée ? Joueur restant éjecté ? Statut :

---

## Bilan synthétique

Compte ici à la fin :
- Total ✅ : __
- Total ⚠️ : __
- Total ❌ : __

Anomalies les plus gênantes (3 max) :
1.
2.
3.
