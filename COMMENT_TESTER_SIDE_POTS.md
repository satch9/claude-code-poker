# Comment Tester le Système de Side Pots

## 🎯 Méthodes de Test

### 1. Test dans l'Application (Recommandé)

**Créer une table avec 3+ joueurs :**
1. Ouvrir l'application poker
2. Créer/rejoindre une table avec au moins 3 joueurs
3. Distribuer des jetons différents aux joueurs
4. Créer un scénario all-in

**Scénario de test simple :**
- Joueur 1 : 100 jetons → all-in (100)
- Joueur 2 : 50 jetons → all-in (50)
- Joueur 3 : 30 jetons → all-in (30)

**Résultat attendu :**
- Pot 1 : 90 jetons (30×3) → tous éligibles
- Pot 2 : 40 jetons (20×2) → J1 et J2 seulement  
- Pot 3 : 50 jetons (50×1) → J1 seulement

### 2. Logs à Surveiller

**Console Serveur (Convex):**
```
🎰 Side pots calculated: [
  { amount: 90, eligiblePlayers: [id1, id2, id3] },
  { amount: 40, eligiblePlayers: [id1, id2] },
  { amount: 50, eligiblePlayers: [id1] }
]
🎰 Side pot 1: 90 jetons, 1 gagnant(s), 90 jetons chacun
🎰 Side pot 2: 40 jetons, 1 gagnant(s), 40 jetons chacun
🎰 Side pot 3: 50 jetons, 1 gagnant(s), 50 jetons chacun
```

**Console Client (Navigateur):**
```
🎮 Client: autoAdvanceAt detected, phase=showdown
🎮 Client: Timeout fired, advancing from river
```

### 3. Vérification des Résultats

**Dans l'Action Feed :**
- Doit afficher : "Alice remporte 90 jetons (pot 1) avec Paire de Rois"
- Doit afficher : "Bob remporte 40 jetons (pot 2) avec Paire de Dames"
- Doit afficher : "Charlie remporte 50 jetons (pot 3) avec Hauteur As"

**Vérification des Jetons :**
- Somme des jetons distribués = Total des mises
- Chaque joueur reçoit le bon montant selon sa main

### 4. Test avec le Fichier HTML

**Ouvrir test-side-pots.html :**
1. Naviguer vers le fichier dans votre navigateur
2. Cliquer sur "Exécuter Tous les Tests"
3. Vérifier que les résultats correspondent aux attendus

## 🚨 Signaux d'Alarme

**Le système NE fonctionne PAS si :**
- ❌ Un seul gagnant reçoit tous les jetons
- ❌ Les logs montrent seulement "Distribute main pot"
- ❌ Les montants ne correspondent pas aux mises
- ❌ L'action feed ne montre qu'un seul gagnant

**Le système fonctionne BIEN si :**
- ✅ Logs montrent "🎰 Side pots calculated"
- ✅ Plusieurs gagnants avec montants différents
- ✅ Action feed montre "pot 1", "pot 2", etc.
- ✅ Total distribué = Total des mises

## 🔧 Debugging

**Si les side pots ne fonctionnent pas :**

1. **Vérifier les logs serveur** pour voir si calculateSidePots est appelé
2. **Vérifier le mapping des données** dans gameEngine.ts ligne 773-780
3. **Vérifier que players.map inclut bien isFolded** (pas chips)
4. **Tester d'abord avec 2 joueurs** pour s'assurer que le base fonctionne

**Commandes utiles :**
```bash
# Voir les logs Convex en temps réel
npx convex dev

# Ouvrir les outils de développement
F12 dans le navigateur → Console
```

## 📊 Cas de Test Avancés

### Test 1: Égalité dans Side Pot
- 3 joueurs avec même main dans pot principal
- Gagnants différents dans side pots

### Test 2: Joueur Couché
- 4 joueurs, 1 couché
- Vérifier que le joueur couché n'est pas éligible

### Test 3: All-in Partiels
- Joueurs avec mises différentes
- Certains all-in, d'autres non

## 🎯 Validation Finale

**Le système est validé quand :**
1. Les 5 tests de tournament_sample.json passent
2. Les logs montrent le bon nombre de side pots
3. Les jetons sont distribués correctement
4. Les égalités sont gérées par side pot
5. L'interface utilisateur affiche les bons résultats

**Temps d'exécution :** 
- Tests simples : 2-3 minutes
- Tests complets : 10-15 minutes
- Validation tournament_sample.json : 5-10 minutes