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
- [ ] **1.2** Joueur A : refresh la page (F5) → la session persiste. Statut :
- [ ] **1.3** Joueur A : signout → retour à l'écran de connexion. Statut :
- [ ] **1.4** Joueur A : signin avec les credentials créés en 1.1 → loggé. Statut :
- [ ] **1.5** Joueur A : signin avec un mauvais mot de passe → message d'erreur clair. Statut :
- [ ] **1.6** Joueur A : signup avec un email déjà utilisé → message d'erreur clair. Statut :
- [ ] **1.7** Joueur B (session privée) : signup avec un autre email → loggé en parallèle de A. Statut :

## Parcours 2 — Création table

- [ ] **2.1** Joueur A : créer une table cash, 2 joueurs max, blindes 5/10, stack 1000, privée → table créée. Statut :
- [ ] **2.2** Le code d'invitation est affiché clairement et copiable. Statut :
- [ ] **2.3** A est automatiquement assis à un siège (ou doit cliquer pour s'asseoir ?). Statut :
- [ ] **2.4** Champs invalides (smallBlind=0, maxPlayers=1) → bloqués ou message clair. Statut :

## Parcours 3 — Rejoindre table par code

- [ ] **3.1** Joueur B : entrer le code reçu de A → arrive sur la table. Statut :
- [ ] **3.2** B est assis à un siège libre. Statut :
- [ ] **3.3** A voit B arriver en temps réel (sans refresh). Statut :
- [ ] **3.4** Code invalide → erreur claire. Statut :
- [ ] **3.5** Casse de la casse (CODE en minuscules) → fonctionne ou message clair. Statut :

## Parcours 4 — Partie heads-up complète

- [ ] **4.1** A (créateur) clique "démarrer" → la partie commence. Statut :
- [ ] **4.2** Les 2 joueurs voient leurs 2 cartes privées (l'un ne voit pas celles de l'autre). Statut :
- [ ] **4.3** Les blindes sont posées correctement (SB par dealer, BB par l'autre). Statut :
- [ ] **4.4** Préflop : SB doit agir en premier (heads-up). Statut :
- [ ] **4.5** A peut call/fold/raise/all-in selon les options proposées. Statut :
- [ ] **4.6** Après que les 2 ont agi, le flop apparaît (3 cartes communautaires). Statut :
- [ ] **4.7** Postflop : BB doit agir en premier (heads-up). Statut :
- [ ] **4.8** Turn → river → showdown : les phases s'enchaînent correctement. Statut :
- [ ] **4.9** Au showdown, les 2 mains sont révélées et le gagnant est désigné. Statut :
- [ ] **4.10** Le pot est crédité au gagnant correctement. Statut :

## Parcours 5 — Multi-mains et élimination

- [ ] **5.1** Une fois la main 1 finie, la main 2 démarre (auto ou bouton). Statut :
- [ ] **5.2** Le dealer button a tourné (rotation correcte heads-up). Statut :
- [ ] **5.3** Les blindes sont posées par les bons joueurs cette fois. Statut :
- [ ] **5.4** Les cartes sont redistribuées (différentes des précédentes). Statut :
- [ ] **5.5** Faire une main avec un all-in : le perdant est éliminé ou reste à 0 ? (noter le comportement). Statut :
- [ ] **5.6** Si élimination : message de fin / retour vers l'écran d'accueil ? Statut :

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
