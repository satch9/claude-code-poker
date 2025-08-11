// Script de test pour observer les logs Convex avec une vraie partie
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "https://jovial-sponge-570.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

console.log("🚀 TEST AVEC SERVEUR CONVEX - LOGS EN TEMPS RÉEL");
console.log("===============================================");

async function testRealGame() {
  try {
    console.log("📡 Connexion au serveur Convex...");
    
    // Simuler des identités utilisateur
    const players = [];
    for (let i = 0; i < 4; i++) {
      // Dans un vrai test, on aurait des tokens JWT
      players.push({
        id: `test-user-${i}`,
        name: `TestPlayer${i}`
      });
    }
    
    console.log("👥 Joueurs de test créés:", players.map(p => p.name));
    
    // Instructions pour tester manuellement
    console.log("\n🎯 === INSTRUCTIONS POUR LE TEST MANUEL ===");
    console.log("1. Ouvrez votre application poker dans le navigateur");
    console.log("2. Créez une table privée avec 4 joueurs");
    console.log("3. Ouvrez 4 onglets/navigateurs et rejoignez avec différents joueurs");
    console.log("4. Démarrez la partie");
    console.log("5. Observez les logs dans votre terminal Convex (npx convex dev)");
    console.log("");
    
    console.log("🔍 === LOGS À OBSERVER ===");
    console.log("✅ Au PREFLOP:");
    console.log("   🎯 === ANALYSE ORDRE D'ACTION - PHASE: PREFLOP ===");
    console.log("   📍 Dealer position: X");
    console.log("   👥 All players: [0,1,2,3]");
    console.log("   ✅ Premier joueur calculé (preflop): PosX");
    console.log("");
    
    console.log("✅ Au FLOP:");
    console.log("   🎯 === ANALYSE ORDRE D'ACTION - PHASE: FLOP ===");
    console.log("   📍 Dealer position: X");
    console.log("   👥 Active players (non all-in): [...]");
    console.log("   ✅ Premier joueur calculé: PosX");
    console.log("");
    
    console.log("✅ À chaque action:");
    console.log("   🎮 === ACTION JOUEUR - PHASE: FLOP ===");
    console.log("   👤 Joueur: PosX | Action: call");
    console.log("   📊 État: Dealer=PosY, JoueurActuel=PosX");
    console.log("");
    
    console.log("🚨 === CE QU'IL FAUT VÉRIFIER ===");
    console.log("❌ BUG RAPPORTÉ: Charlie (UTG/Pos2) parle en premier au flop");
    console.log("✅ CORRECT: Alice (SB/Pos0) devrait parler en premier au flop");
    console.log("");
    console.log("Si vous voyez 'Premier joueur calculé: Pos2' au flop → BUG confirmé");
    console.log("Si vous voyez 'Premier joueur calculé: Pos0' au flop → Code correct");
    console.log("");
    
    // Test de connexion simple au serveur
    try {
      // Essayer de récupérer une table publique pour vérifier la connexion
      const tables = await client.query("core/tables:getTables", {});
      console.log(`✅ Connexion Convex réussie - ${tables.length} tables trouvées`);
    } catch (error) {
      console.log("⚠️ Erreur de connexion Convex:", error.message);
      console.log("💡 Assurez-vous que 'npx convex dev' est en cours d'exécution");
    }
    
    console.log("\n📋 === PROCÉDURE DE TEST ===");
    console.log("1. Ouvrez un terminal et lancez: npx convex dev");
    console.log("2. Dans un autre terminal: npm run dev");
    console.log("3. Ouvrez http://localhost:5173 dans 4 onglets");
    console.log("4. Créez une table et rejoignez avec 4 joueurs différents");
    console.log("5. Positions attendues:");
    console.log("   - Dealer: Pos3 (Diana)");
    console.log("   - SB: Pos0 (Alice)");
    console.log("   - BB: Pos1 (Bob)");
    console.log("   - UTG: Pos2 (Charlie)");
    console.log("6. Observez les logs dans le terminal Convex");
    console.log("");
    
    console.log("✅ === ATTENTES CORRECTES ===");
    console.log("PREFLOP: Charlie (Pos2) parle en premier ← CORRECT");
    console.log("FLOP: Alice (Pos0/SB) parle en première ← CORRECT");
    console.log("Si Charlie parle au flop → BUG CONFIRMÉ");
    
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

// Fonction pour surveiller les logs en temps réel
async function monitorLogs() {
  console.log("\n🔄 === SURVEILLANCE LOGS (Simulation) ===");
  console.log("💡 Les vrais logs apparaîtront dans votre terminal 'npx convex dev'");
  console.log("");
  
  // Simulation de ce que vous devriez voir dans les logs
  const scenarios = [
    {
      phase: "PREFLOP",
      dealer: 3,
      expected: 2,
      logs: [
        "🎯 === ANALYSE ORDRE D'ACTION - PHASE: PREFLOP ===",
        "📍 Dealer position: 3",
        "👥 All players: [0,1,2,3]",
        "✅ Premier joueur calculé (preflop): Pos2",
        "📜 Règle: En preflop, UTG (Dealer+3) parle en premier",
        "🎯 Logique: Dealer(3) + 3 → Pos2"
      ]
    },
    {
      phase: "FLOP",
      dealer: 3,
      expected: 0,
      logs: [
        "🎯 === ANALYSE ORDRE D'ACTION - PHASE: FLOP ===",
        "📍 Dealer position: 3",
        "👥 Active players (non all-in): [0,1,2,3]",
        "✅ Premier joueur calculé: Pos0",
        "📜 Règle: En flop, SB (ou premier après dealer) parle en premier",
        "🎯 Logique: Dealer(3) + 1 → Pos0"
      ]
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`\n📋 SCÉNARIO ${index + 1}: ${scenario.phase}`);
    console.log("Logs attendus:");
    scenario.logs.forEach(log => console.log(`   ${log}`));
    
    if (scenario.phase === "FLOP" && scenario.expected !== 0) {
      console.log("   🚨 BUG: Si vous voyez autre chose que Pos0, c'est le bug!");
    }
  });
}

// Exécution
console.log("🎯 Démarrage du test...\n");

testRealGame()
  .then(() => monitorLogs())
  .then(() => {
    console.log("\n✅ === TEST PRÉPARÉ ===");
    console.log("🔍 Maintenant lancez votre partie et observez les logs!");
    console.log("📊 Les logs détaillés vont apparaître dans 'npx convex dev'");
  })
  .catch(console.error);