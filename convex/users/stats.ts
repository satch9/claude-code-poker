import { query } from "../_generated/server";
import { v } from "convex/values";

// Get comprehensive user statistics
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all players records for this user to find their player IDs
    const userPlayers = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const playerIds = userPlayers.map(p => p._id);
    
    // Get all game actions for this user's player IDs
    const allActions = await ctx.db
      .query("gameActions")
      .collect();
    
    // Filter actions for this user's player IDs
    const userActions = allActions.filter(action => 
      playerIds.includes(action.playerId as any) || 
      action.playerName === userPlayers[0]?.userId // fallback for system messages
    );

    if (userActions.length === 0) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        totalWinnings: 0,
        totalBets: 0,
        handsPlayed: 0,
        mostFrequentAction: "N/A",
        averageGameDuration: 0,
        tournamentWins: 0,
        biggestWin: 0,
        actionBreakdown: {
          fold: 0,
          check: 0,
          call: 0,
          raise: 0,
          allIn: 0,
        },
        recentActivity: [],
        longestWinStreak: 0,
        currentWinStreak: 0,
      };
    }

    // Calculate basic stats
    const winActions = userActions.filter(action => action.action === "win");
    const gamesWon = winActions.length;
    const totalWinnings = winActions.reduce((sum, action) => sum + (action.amount || 0), 0);

    // Get unique hands played
    const uniqueHands = new Set();
    const playerActions = userActions.filter(action => 
      action.action !== "win" && 
      action.action !== "system" && 
      action.handNumber
    );
    
    playerActions.forEach(action => {
      if (action.handNumber && action.tableId) {
        uniqueHands.add(`${action.tableId}-${action.handNumber}`);
      }
    });
    
    const gamesPlayed = uniqueHands.size;
    const handsPlayed = playerActions.length;

    // Calculate action breakdown
    const actionCounts = {
      fold: 0,
      check: 0,
      call: 0,
      raise: 0,
      allIn: 0,
    };

    let totalBets = 0;
    playerActions.forEach(action => {
      switch (action.action) {
        case "fold":
          actionCounts.fold++;
          break;
        case "check":
          actionCounts.check++;
          break;
        case "call":
          actionCounts.call++;
          totalBets += action.amount || 0;
          break;
        case "raise":
          actionCounts.raise++;
          totalBets += action.amount || 0;
          break;
        case "all-in":
          actionCounts.allIn++;
          totalBets += action.amount || 0;
          break;
      }
    });

    // Find most frequent action
    const mostFrequentAction = Object.entries(actionCounts).reduce((max, [action, count]) => 
      count > max.count ? { action, count } : max, 
      { action: "fold", count: 0 }
    ).action;

    // Calculate win rate
    const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

    // Find biggest win
    const biggestWin = winActions.reduce((max, action) => 
      Math.max(max, action.amount || 0), 0
    );

    // Calculate tournament wins (actions with message containing "tournoi")
    const tournamentWins = winActions.filter(action => 
      action.message?.toLowerCase().includes("tournoi")
    ).length;

    // Calculate average game duration (simplified - time between first and last action per hand)
    const gamesByHand = new Map();
    playerActions.forEach(action => {
      if (action.handNumber && action.tableId) {
        const key = `${action.tableId}-${action.handNumber}`;
        if (!gamesByHand.has(key)) {
          gamesByHand.set(key, { start: action.timestamp, end: action.timestamp });
        } else {
          const game = gamesByHand.get(key);
          game.start = Math.min(game.start, action.timestamp);
          game.end = Math.max(game.end, action.timestamp);
        }
      }
    });

    const gameDurations = Array.from(gamesByHand.values()).map(game => 
      (game.end - game.start) / (1000 * 60) // Convert to minutes
    );
    const averageGameDuration = gameDurations.length > 0 
      ? gameDurations.reduce((sum, duration) => sum + duration, 0) / gameDurations.length 
      : 0;

    // Calculate win streaks
    const gameResults = Array.from(uniqueHands).map(handKey => {
      const [tableId, handNumber] = (handKey as string).split('-');
      return winActions.some(win => 
        win.tableId === tableId && 
        win.handNumber === parseInt(handNumber)
      );
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = gameResults.length - 1; i >= 0; i--) {
      if (gameResults[i]) {
        tempStreak++;
        if (i === gameResults.length - 1 || gameResults[i + 1]) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
        if (i === gameResults.length - 1) {
          currentStreak = 0;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Get recent activity (last 10 significant actions)
    const recentActivity = userActions
      .filter(action => action.action === "win" || action.action === "all-in" || action.action === "raise")
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(action => ({
        action: action.action,
        amount: action.amount,
        message: action.message,
        timestamp: action.timestamp,
        phase: action.phase,
      }));

    return {
      gamesPlayed,
      gamesWon,
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
      totalWinnings,
      totalBets,
      handsPlayed,
      mostFrequentAction,
      averageGameDuration: Math.round(averageGameDuration * 10) / 10,
      tournamentWins,
      biggestWin,
      actionBreakdown: actionCounts,
      recentActivity,
      longestWinStreak: longestStreak,
      currentWinStreak: currentStreak,
    };
  },
});

// Get user hand history : pour chaque main jouée par l'utilisateur, renvoie
// le tableId/tableName, handNumber, timestamp, et résultat (gagné ou non + gain).
// Utilisé par /stats pour la section "Mains jouées".
export const getUserHandsHistory = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Player records de l'utilisateur (pour relier playerId → user)
    const userPlayers = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const playerIds = new Set(userPlayers.map((p) => p._id));
    if (playerIds.size === 0) return [];

    // On ne tire que les actions du user via filter (full scan) — acceptable
    // pour le MVP, le volume reste modeste.
    const allActions = await ctx.db.query("gameActions").collect();
    const userActions = allActions.filter((a) => playerIds.has(a.playerId as any));

    // Grouper par main = (tableId, handNumber)
    type HandKey = string;
    const handsMap = new Map<
      HandKey,
      {
        tableId: string;
        handNumber: number;
        startTs: number;
        endTs: number;
        won: boolean;
        amountWon: number;
        finalAction?: string;
      }
    >();

    for (const a of userActions) {
      if (!a.tableId || !a.handNumber) continue;
      const key: HandKey = `${a.tableId}-${a.handNumber}`;
      let h = handsMap.get(key);
      if (!h) {
        h = {
          tableId: a.tableId,
          handNumber: a.handNumber,
          startTs: a.timestamp,
          endTs: a.timestamp,
          won: false,
          amountWon: 0,
        };
        handsMap.set(key, h);
      }
      h.startTs = Math.min(h.startTs, a.timestamp);
      h.endTs = Math.max(h.endTs, a.timestamp);
      if (a.action === "win") {
        h.won = true;
        h.amountWon += a.amount || 0;
      } else if (a.action !== "system" && a.action !== "blind") {
        // Garde la dernière action métier comme "finale"
        if (!h.finalAction || a.timestamp >= h.endTs) {
          h.finalAction = a.action;
        }
      }
    }

    // Tri desc par fin de main (plus récente d'abord)
    const hands = Array.from(handsMap.values()).sort((a, b) => b.endTs - a.endTs);
    const sliced = hands.slice(0, limit);

    // Enrichir avec le nom de la table
    const enriched = await Promise.all(
      sliced.map(async (h) => {
        const table = await ctx.db.get(h.tableId as any);
        return {
          ...h,
          tableName: (table as any)?.name ?? "Table inconnue",
          gameType: (table as any)?.gameType,
        };
      })
    );

    return enriched;
  },
});

// Get user ranking compared to other players
export const getUserRanking = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all users' basic stats for ranking
    const allUsers = await ctx.db.query("users").collect();
    const userStats = [];

    for (const user of allUsers) {
      // Get all players records for this user
      const userPlayerRecords = await ctx.db
        .query("players")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      
      const userPlayerIds = userPlayerRecords.map(p => p._id);
      
      // Get all actions for this user
      const allActionsForUser = await ctx.db
        .query("gameActions")
        .collect();
      
      const actions = allActionsForUser.filter(action => 
        userPlayerIds.includes(action.playerId as any)
      );

      const wins = actions.filter(a => a.action === "win");
      const gamesWon = wins.length;
      const totalWinnings = wins.reduce((sum, a) => sum + (a.amount || 0), 0);
      
      // Count unique games
      const uniqueHands = new Set();
      actions.filter(a => a.handNumber && a.tableId && a.action !== "win" && a.action !== "system")
        .forEach(a => uniqueHands.add(`${a.tableId}-${a.handNumber}`));
      const gamesPlayed = uniqueHands.size;

      userStats.push({
        userId: user._id,
        name: user.name,
        gamesWon,
        gamesPlayed,
        totalWinnings,
        winRate: gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0,
      });
    }

    // Ne garder que les utilisateurs qui ont effectivement joué au moins
    // une main (sinon on compte tous les comptes inscrits, même inactifs).
    const playedStats = userStats.filter((s) => s.gamesPlayed > 0);

    // Sort by total winnings
    playedStats.sort((a, b) => b.totalWinnings - a.totalWinnings);

    const userRank = playedStats.findIndex((stat) => stat.userId === args.userId) + 1;
    const totalPlayers = playedStats.length;

    // Get top 5 players
    const topPlayers = playedStats.slice(0, 5).map((stat, index) => ({
      rank: index + 1,
      name: stat.name,
      totalWinnings: stat.totalWinnings,
      winRate: Math.round(stat.winRate * 10) / 10,
      gamesPlayed: stat.gamesPlayed,
    }));

    return {
      userRank,
      totalPlayers,
      topPlayers,
    };
  },
});