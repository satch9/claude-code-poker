// Test automatisé avec 9 joueurs et logs détaillés
import { convexTest } from "convex/test";

// Configuration du test
const SMALL_STACK = 300; // Petites stacks pour aller vite
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

console.log("🚀 DÉBUT DU TEST AUTOMATISÉ - TABLE 9 JOUEURS");
console.log("=====================================");
console.log(`Stack par joueur: ${SMALL_STACK} chips`);
console.log(`Blinds: SB ${SMALL_BLIND} / BB ${BIG_BLIND}`);
console.log("");

async function runAutomatedPokerTest() {
  const t = convexTest();
  
  try {
    // Créer 9 utilisateurs
    const users = [];
    for (let i = 0; i < 9; i++) {
      const user = await t.withIdentity({ subject: `player${i}` });
      users.push({
        client: user,
        id: `player${i}`,
        name: `Player${i}`,
        position: i
      });
    }
    
    console.log("👥 JOUEURS CRÉÉS:");
    users.forEach(user => {
      console.log(`   Position ${user.position}: ${user.name} (${user.id})`);
    });
    console.log("");
    
    // Player 0 crée la table
    const creator = users[0].client;
    const tableId = await creator.mutation("core/tables:createTable", {
      name: "Test Auto 9J",
      maxPlayers: 9,
      buyIn: SMALL_STACK,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      isPrivate: false
    });
    
    console.log(`🎯 TABLE CRÉÉE: ${tableId}`);
    console.log("");
    
    // Tous les joueurs rejoignent
    for (let i = 0; i < 9; i++) {
      const user = users[i];
      await user.client.mutation("core/tables:joinTable", {
        tableId,
        seatPosition: i
      });
      console.log(`   ✅ ${user.name} rejoint position ${i}`);
    }
    
    console.log("");
    console.log("🎲 DÉMARRAGE DE LA PARTIE");
    console.log("=========================");
    
    // Démarrer la partie
    await creator.mutation("core/gameEngine:startGame", { tableId });
    
    let handNumber = 1;
    let maxHands = 20; // Limite pour éviter les boucles infinies
    
    while (handNumber <= maxHands) {
      console.log("");
      console.log(`🃏 === MAIN #${handNumber} ===`);
      
      // Récupérer l'état de la table
      let gameState = await creator.query("core/tables:getTable", { tableId });
      
      if (!gameState || gameState.status !== "active") {
        console.log("❌ Partie terminée ou erreur");
        break;
      }
      
      // Analyser les positions
      const dealer = gameState.dealerPosition;
      const players = gameState.players.filter(p => !p.isEliminated);
      const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
      
      console.log(`📊 État: Phase=${gameState.phase}, Dealer=Pos${dealer}, Joueurs actifs=${activePlayers.length}`);
      
      // Afficher les stacks
      console.log("💰 STACKS:");
      players.forEach(p => {
        const status = p.isEliminated ? "ÉLIMINÉ" : 
                     p.isFolded ? "FOLD" : 
                     p.isAllIn ? "ALL-IN" : "ACTIF";
        console.log(`   Pos${p.seatPosition}: ${p.chips} chips [${status}]`);
      });
      
      // Calculer les blinds
      const numPlayers = players.length;
      const dealerIndex = players.findIndex(p => p.seatPosition === dealer);
      const sbIndex = (dealerIndex + 1) % numPlayers;
      const bbIndex = (dealerIndex + 2) % numPlayers;
      const sbPos = players[sbIndex].seatPosition;
      const bbPos = players[bbIndex].seatPosition;
      
      console.log(`🎯 POSITIONS: Dealer=Pos${dealer}, SB=Pos${sbPos}, BB=Pos${bbPos}`);
      
      // Simuler les phases de jeu
      const phases = ['preflop', 'flop', 'turn', 'river'];
      
      for (const phase of phases) {
        if (gameState.phase !== phase && gameState.phase !== 'showdown') continue;
        
        console.log(`\n📋 === PHASE: ${phase.toUpperCase()} ===`);
        
        // Calculer le premier joueur selon les règles
        let expectedFirstPlayer;
        if (phase === 'preflop') {
          // UTG = Dealer + 3
          const utgIndex = (dealerIndex + 3) % numPlayers;
          expectedFirstPlayer = players[utgIndex].seatPosition;
        } else {
          // SB ou premier actif après
          expectedFirstPlayer = sbPos;
          // Si SB fold, prendre le suivant
          const sbPlayer = players.find(p => p.seatPosition === sbPos);
          if (sbPlayer && sbPlayer.isFolded) {
            let nextIndex = (sbIndex + 1) % numPlayers;
            while (players[nextIndex].isFolded && nextIndex !== sbIndex) {
              nextIndex = (nextIndex + 1) % numPlayers;
            }
            expectedFirstPlayer = players[nextIndex].seatPosition;
          }
        }
        
        console.log(`🎯 RÈGLES: Premier joueur attendu = Pos${expectedFirstPlayer}`);
        console.log(`🎯 SERVEUR: Joueur actuel = Pos${gameState.currentPlayerPosition}`);
        
        // Vérification
        if (gameState.currentPlayerPosition === expectedFirstPlayer) {
          console.log("✅ CORRECT: L'ordre respecte les règles du poker");
        } else {
          console.log("❌ ERREUR: L'ordre ne respecte PAS les règles du poker");
          console.log(`   Attendu: Pos${expectedFirstPlayer}, Reçu: Pos${gameState.currentPlayerPosition}`);
        }
        
        // Simuler les actions des joueurs automatiquement
        let safety = 0;
        const MAX_ACTIONS = 50; // Protection contre boucles infinies
        
        while (gameState.phase === phase && gameState.status === "active" && safety < MAX_ACTIONS) {
          safety++;
          
          const currentPlayer = gameState.players.find(p => 
            p.seatPosition === gameState.currentPlayerPosition && !p.isFolded && !p.isEliminated
          );
          
          if (!currentPlayer) {
            console.log("⚠️ Aucun joueur actuel trouvé");
            break;
          }
          
          console.log(`\n🎮 Action automatique - Pos${currentPlayer.seatPosition} (${currentPlayer.chips} chips)`);
          
          // Logique d'action automatique simplifiée
          const currentBet = gameState.currentBet || 0;
          const playerBet = currentPlayer.currentBet || 0;
          const toCall = currentBet - playerBet;
          
          console.log(`   💰 Mise actuelle: ${currentBet}, Joueur payé: ${playerBet}, À payer: ${toCall}`);
          
          let action;
          let amount = 0;
          
          // Stratégie simple: 
          // - Si stack < 5 blinds: all-in ou fold (50/50)
          // - Si petit call (< 20% stack): call
          // - Sinon: fold ou call (70/30)
          
          if (currentPlayer.chips <= 5 * BIG_BLIND) {
            // Stack critique
            if (Math.random() < 0.5) {
              action = "all-in";
              amount = currentPlayer.chips;
            } else {
              action = "fold";
            }
          } else if (toCall === 0) {
            // Peut checker
            action = "check";
          } else if (toCall <= currentPlayer.chips * 0.2) {
            // Call pas cher
            action = "call";
            amount = toCall;
          } else {
            // Call cher
            if (Math.random() < 0.3) {
              action = "call";
              amount = toCall;
            } else {
              action = "fold";
            }
          }
          
          console.log(`   🎯 Décision: ${action}${amount > 0 ? ` (${amount})` : ""}`);
          
          // Exécuter l'action
          try {
            const playerClient = users.find(u => u.position === currentPlayer.seatPosition)?.client;
            
            if (!playerClient) {
              console.log("❌ Client joueur non trouvé");
              break;
            }
            
            switch (action) {
              case "fold":
                await playerClient.mutation("core/gameEngine:playerAction", {
                  tableId,
                  action: "fold"
                });
                break;
              case "check":
                await playerClient.mutation("core/gameEngine:playerAction", {
                  tableId,
                  action: "check"
                });
                break;
              case "call":
                await playerClient.mutation("core/gameEngine:playerAction", {
                  tableId,
                  action: "call",
                  amount
                });
                break;
              case "all-in":
                await playerClient.mutation("core/gameEngine:playerAction", {
                  tableId,
                  action: "all-in"
                });
                break;
            }
            
            // Attendre un peu pour la synchronisation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Récupérer le nouvel état
            gameState = await creator.query("core/tables:getTable", { tableId });
            
          } catch (error) {
            console.log(`❌ Erreur action ${action}:`, error.message);
            break;
          }
        }
        
        if (safety >= MAX_ACTIONS) {
          console.log("⚠️ Limite de sécurité atteinte - arrêt de la phase");
          break;
        }
      }
      
      // Vérifier si la partie continue
      gameState = await creator.query("core/tables:getTable", { tableId });
      const remainingPlayers = gameState.players.filter(p => !p.isEliminated && p.chips > 0);
      
      console.log(`\n📊 FIN MAIN #${handNumber}: ${remainingPlayers.length} joueurs restants`);
      
      if (remainingPlayers.length <= 1) {
        console.log("🏆 PARTIE TERMINÉE - UN SEUL SURVIVANT!");
        if (remainingPlayers.length === 1) {
          const winner = remainingPlayers[0];
          console.log(`🥇 GAGNANT: Pos${winner.seatPosition} avec ${winner.chips} chips`);
        }
        break;
      }
      
      if (gameState.status !== "active") {
        console.log("⏹️ Partie arrêtée");
        break;
      }
      
      handNumber++;
      
      // Petite pause entre les mains
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log("\n🎯 === RÉSUMÉ FINAL ===");
    const finalState = await creator.query("core/tables:getTable", { tableId });
    if (finalState) {
      const survivors = finalState.players.filter(p => !p.isEliminated && p.chips > 0);
      console.log(`📊 Joueurs survivants: ${survivors.length}`);
      survivors.forEach(p => {
        console.log(`   🏅 Pos${p.seatPosition}: ${p.chips} chips`);
      });
    }
    
  } catch (error) {
    console.error("❌ ERREUR PENDANT LE TEST:", error);
    console.error(error.stack);
  }
  
  console.log("\n✅ TEST TERMINÉ");
}

// Exécution
runAutomatedPokerTest()
  .then(() => {
    console.log("🎯 Script terminé avec succès");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });