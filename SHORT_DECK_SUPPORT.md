# Support Short Deck (6+ Hold'em)

## 🃏 Vue d'ensemble

Le `handEvaluator.ts` supporte maintenant le **Short Deck (6+ Hold'em)**, une variante populaire du Texas Hold'em qui utilise un deck réduit de 36 cartes au lieu des 52 cartes traditionnelles.

## 📋 Règles du Short Deck

### Cartes utilisées
- **Rangs** : 6, 7, 8, 9, 10, J, Q, K, A
- **Couleurs** : ♥️ Cœur, ♦️ Carreau, ♣️ Trèfle, ♠️ Pique
- **Total** : 36 cartes (9 rangs × 4 couleurs)

### Différences avec le Texas Hold'em standard
1. **Pas de cartes 2-5** : Les cartes 2, 3, 4, 5 sont retirées
2. **Quinte flush impossible** : Impossible de faire une quinte flush (pas de 2-3-4-5-6)
3. **Mains plus fortes** : Les paires, brelans et flushes sont plus fréquents
4. **Action plus rapide** : Les mains sont généralement plus fortes

## 🚀 Fonctions disponibles

### Évaluation des mains

```typescript
// Évaluation standard (Texas Hold'em)
const standardHand = evaluateHandRobust(cards);

// Évaluation Short Deck
const shortDeckHand = evaluateShortDeckHand(cards);
```

### Détermination des gagnants

```typescript
// Gagnants standard
const winners = determineWinners(hands);

// Gagnants Short Deck
const shortDeckWinners = determineShortDeckWinners(hands);
```

### Comparaison de mains

```typescript
// Comparaison standard
const result = compareHands(hand1, hand2);

// Comparaison Short Deck
const shortDeckResult = compareShortDeckHands(hand1, hand2);
```

### Création de deck

```typescript
// Deck standard (52 cartes)
const standardDeck = createDeck(); // depuis poker.ts

// Deck Short Deck (36 cartes)
const shortDeck = createShortDeck();
```

### Validation

```typescript
// Validation standard
const isValid = validateHand(cards);

// Validation Short Deck
const isValidShortDeck = validateShortDeckHand(cards);
```

## 📊 Classement des mains (Short Deck)

| Rang | Main | Description |
|------|------|-------------|
| 9 | Royal Flush | Quinte flush A-K-Q-J-10 |
| 8 | Straight Flush | Quinte flush (impossible en Short Deck) |
| 7 | Four of a Kind | Carré |
| 6 | Full House | Full |
| 5 | Flush | Couleur |
| 4 | Straight | Quinte |
| 3 | Three of a Kind | Brelan |
| 2 | Two Pair | Deux paires |
| 1 | One Pair | Paire |
| 0 | High Card | Carte haute |

## 💡 Exemples d'utilisation

### Exemple 1 : Évaluation d'une main Short Deck

```typescript
import { evaluateShortDeckHand, createShortDeck } from './handEvaluator';

const shortDeck = createShortDeck();
const playerCards = [
  { rank: 'A', suit: 'hearts' },
  { rank: 'K', suit: 'hearts' }
];
const communityCards = [
  { rank: 'Q', suit: 'hearts' },
  { rank: 'J', suit: 'hearts' },
  { rank: '10', suit: 'hearts' }
];

const allCards = [...playerCards, ...communityCards];
const handRank = evaluateShortDeckHand(allCards);

console.log(handRank.name); // "Royal Flush"
console.log(handRank.rank); // 9
```

### Exemple 2 : Comparaison de mains Short Deck

```typescript
import { determineShortDeckWinners } from './handEvaluator';

const hands = [
  { hand: handRank1, playerId: 'player1' },
  { hand: handRank2, playerId: 'player2' }
];

const winners = determineShortDeckWinners(hands);
console.log('Gagnants:', winners); // ['player1']
```

### Exemple 3 : Validation d'un deck Short Deck

```typescript
import { validateShortDeckHand } from './handEvaluator';

const validCards = [
  { rank: '6', suit: 'hearts' },
  { rank: '7', suit: 'diamonds' },
  { rank: '8', suit: 'clubs' }
];

const isValid = validateShortDeckHand(validCards); // true

const invalidCards = [
  { rank: '2', suit: 'hearts' }, // Carte invalide
  { rank: '7', suit: 'diamonds' },
  { rank: '8', suit: 'clubs' }
];

const isInvalid = validateShortDeckHand(invalidCards); // false
```

## 🔧 Intégration avec le jeu

Pour intégrer le Short Deck dans votre jeu de poker :

1. **Créer un deck Short Deck** :
   ```typescript
   const deck = createShortDeck();
   ```

2. **Évaluer les mains** :
   ```typescript
   const handRank = evaluateShortDeckHand(allCards);
   ```

3. **Déterminer les gagnants** :
   ```typescript
   const winners = determineShortDeckWinners(playerHands);
   ```

4. **Valider les cartes** :
   ```typescript
   const isValid = validateShortDeckHand(cards);
   ```

## 🎯 Avantages du Short Deck

1. **Action plus rapide** : Mains plus fortes = plus d'action
2. **Moins de cartes** : Plus facile à gérer
3. **Probabilités différentes** : Nouvelle stratégie requise
4. **Popularité croissante** : Variante très appréciée

## ⚠️ Points d'attention

1. **Compatibilité** : Les fonctions Short Deck sont séparées des fonctions standard
2. **Validation** : Toujours valider les cartes avant évaluation
3. **Deck** : Utiliser `createShortDeck()` au lieu de `createDeck()`
4. **Évaluation** : Utiliser les fonctions spécifiques Short Deck

## 🧪 Tests

Des tests sont disponibles pour vérifier le bon fonctionnement :

```bash
# Test basique Short Deck
node test-short-deck.mjs

# Test d'intégration
node test-short-deck-integration.mjs
```

## 📈 Statistiques

- **Cartes** : 36 au lieu de 52 (-30%)
- **Flushes** : Plus fréquents
- **Paires** : Plus fréquentes
- **Straight Flush** : Impossible
- **Action** : Plus rapide et intense
