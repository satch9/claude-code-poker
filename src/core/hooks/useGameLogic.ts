import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useAuth } from './useAuth';

interface GameAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export const useGameLogic = (tableId: Id<'tables'> | null, onLeaveTable?: () => void) => {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<GameAction | null>(null);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [handNumber, setHandNumber] = useState(1);
  const [timeoutIds, setTimeoutIds] = useState<Set<NodeJS.Timeout>>(new Set());

  // Mutations
  const startGame = useMutation(api.core.gameEngine.startGame);
  const playerAction = useMutation(api.core.gameEngine.playerAction);
  const advancePhase = useMutation(api.core.gameEngine.advancePhase);
  const advanceFromShowdown = useMutation(api.core.gameEngine.advanceFromShowdown);

  // Queries - always called to maintain hook order
  const table = useQuery(
    api.tables.getTable, 
    tableId ? { tableId } : "skip"
  );
  const gameState = useQuery(
    api.tables.getGameState, 
    tableId ? { tableId } : "skip"
  );
  const players = useQuery(
    api.players.getTablePlayers, 
    tableId ? { tableId } : "skip"
  );
  const availableActions = useQuery(
    api.core.gameEngine.getAvailableActions,
    user && tableId ? { tableId, userId: user._id } : 'skip'
  );
  // Re-enable showdown results
  const showdownResults = useQuery(
    api.core.gameEngine.getShowdownResults,
    tableId && gameState?.phase === 'showdown' ? { tableId } : 'skip'
  );

  // Get server-side action feed
  const serverActions = useQuery(
    api.core.gameEngine.getGameActions,
    tableId ? { tableId } : 'skip'
  );

  // Helper function - declared first to avoid circular dependency
  const addActionToHistory = useCallback((actionData: {
    id: string;
    playerName: string;
    action: string;
    amount?: number;
    message?: string;
    timestamp: number;
    isTimeout?: boolean;
  }) => {
    setActionHistory(prev => [...prev, actionData]);
  }, []);

  // Game state helpers - memoized for performance
  const currentPlayer = useMemo(() => 
    players?.find(p => p.userId === user?._id), 
    [players, user?._id]
  );
  
  const isMyTurn = useMemo(() => 
    !!(user && gameState && currentPlayer && 
       gameState.currentPlayerPosition === currentPlayer.seatPosition && 
       gameState.phase !== 'waiting' && 
       gameState.phase !== 'showdown' && 
       !currentPlayer.isFolded && 
       !isProcessing),
    [user, gameState, currentPlayer, isProcessing]
  );

  // Handle timeout - declared early to avoid circular dependency
  const handleTimeOut = useCallback(async () => {
    if (!user || !tableId) return;
    
    // Double check it's still my turn before forcing fold
    if (!isMyTurn) {
      console.log('Timeout triggered but no longer my turn, ignoring');
      return;
    }
    
    try {
      // Force fold by calling playerAction directly
      await playerAction({
        tableId,
        userId: user._id,
        action: 'fold',
      });
      
      // Add timeout action to history
      addActionToHistory({
        id: `${Date.now()}-${user._id}-timeout`,
        playerName: user.name || 'Joueur',
        action: 'fold',
        timestamp: Date.now(),
        isTimeout: true,
      });
    } catch (error) {
      console.error('Failed to force fold on timeout:', error);
    }
  }, [user, tableId, isMyTurn, playerAction, addActionToHistory]);

  // Action handlers
  const handleStartGame = async () => {
    if (!user || !tableId) return;
    
    setIsProcessing(true);
    try {
      await startGame({ tableId });
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsProcessing(false);
    }
  };


  const handlePlayerAction = useCallback(async (action: GameAction) => {
    if (!user || !isMyTurn || !tableId) return;
    
    setIsProcessing(true);
    try {
      // Call the backend mutation
      await playerAction({
        tableId,
        userId: user._id,
        action: action.action,
        amount: action.amount,
      });
      
      // Add action to history
      addActionToHistory({
        id: `${Date.now()}-${user._id}-${action.action}`,
        playerName: user.name || 'Joueur',
        action: action.action,
        amount: action.amount,
        timestamp: Date.now(),
      });
      
      setSelectedAction(null);
      setRaiseAmount(0);
    } catch (error) {
      console.error('Failed to perform action:', error);
      // TODO: Add user-friendly error handling
    } finally {
      setIsProcessing(false);
    }
  }, [user, isMyTurn, tableId, playerAction, addActionToHistory]);

  const handleFold = () => {
    handlePlayerAction({ action: 'fold' });
  };

  const handleCheck = () => {
    handlePlayerAction({ action: 'check' });
  };

  const handleCall = () => {
    const callAction = availableActions?.actions.find(a => a.action === 'call');
    if (callAction) {
      handlePlayerAction({ action: 'call', amount: callAction.amount });
    }
  };

  const handleRaise = (amount: number) => {
    handlePlayerAction({ action: 'raise', amount });
  };

  const handleAllIn = () => {
    const allInAction = availableActions?.actions.find(a => a.action === 'all-in');
    if (allInAction) {
      handlePlayerAction({ action: 'all-in', amount: allInAction.amount });
    }
  };


  // Track phase changes and initialize action history
  useEffect(() => {
    if (!gameState) return;
    
    const phaseNames = {
      'preflop': 'Pré-flop',
      'flop': 'Flop',
      'turn': 'Turn', 
      'river': 'River',
      'showdown': 'Abattage'
    };
    
    const currentPhase = gameState.phase;
    if (currentPhase in phaseNames && currentPhase !== 'waiting') {
      // Only add if we don't already have a system message for this phase
      const hasPhaseMessage = actionHistory.some(action => 
        action.playerName === 'Système' && action.id?.includes(`phase-${currentPhase}`)
      );
      
      if (!hasPhaseMessage) {
        addActionToHistory({
          id: `${Date.now()}-system-phase-${currentPhase}`,
          playerName: 'Système',
          action: 'system',
          message: `Phase: ${phaseNames[currentPhase as keyof typeof phaseNames]}`,
          timestamp: Date.now(),
        });
      }
    }
  }, [gameState?.phase, actionHistory]);

  // Auto-fold on timeout (30 seconds) - Enhanced cleanup
  useEffect(() => {
    if (!isMyTurn || !user || !tableId || gameState?.phase === 'waiting' || gameState?.phase === 'showdown') return;

    const timeoutId = setTimeout(() => {
      handleTimeOut();
    }, 30000); // 30 seconds timeout
    
    // Track timeout for cleanup
    setTimeoutIds(prev => new Set(prev).add(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      setTimeoutIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(timeoutId);
        return newSet;
      });
    };
  }, [isMyTurn, user, tableId, gameState?.phase, handleTimeOut]);

  // Auto-advance phases when all players are all-in - Enhanced with cleanup
  useEffect(() => {
    if (!gameState?.autoAdvanceAt || !tableId) return;
    
    const now = Date.now();
    const timeUntilAdvance = gameState.autoAdvanceAt - now;
    console.log(`🎮 Client: autoAdvanceAt detected, phase=${gameState.phase}, timeUntilAdvance=${timeUntilAdvance}, serverTime=${gameState.autoAdvanceAt}, clientTime=${now}`);
    
    if (timeUntilAdvance <= 0) {
      // Should advance immediately
      console.log(`🎮 Client: Advancing immediately for phase ${gameState.phase}`);
      advancePhase({ tableId }).catch(console.error);
      return;
    }
    
    // Add 100ms buffer to ensure server is ready
    const adjustedDelay = Math.max(100, timeUntilAdvance + 100);
    console.log(`🎮 Client: Setting timeout for ${adjustedDelay}ms (original: ${timeUntilAdvance}ms + 100ms buffer) to advance from ${gameState.phase}`);
    
    const timeoutId = setTimeout(() => {
      console.log(`🎮 Client: Timeout fired, advancing from ${gameState.phase}`);
      advancePhase({ tableId }).catch(console.error);
    }, adjustedDelay);
    
    // Track timeout for cleanup
    setTimeoutIds(prev => new Set(prev).add(timeoutId));

    return () => {
      console.log(`🎮 Client: Clearing timeout for ${gameState.phase}`);
      clearTimeout(timeoutId);
      setTimeoutIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(timeoutId);
        return newSet;
      });
    };
  }, [gameState?.autoAdvanceAt, tableId, advancePhase]);

  // Track hand number
  useEffect(() => {
    if (gameState?.phase === 'preflop' && gameState?.pot === 0) {
      setHandNumber(prev => prev + 1);
    }
  }, [gameState?.phase, gameState?.pot]);

  // Check for tournament end and redirect to lobby
  useEffect(() => {
    if (!table || !user || !onLeaveTable) return;

    if (table.status === 'finished' && table.gameType === 'tournament') {
      // Tournament has ended, redirect to lobby after a delay to show final results
      const timeoutId = setTimeout(() => {
        console.log('Tournament finished, redirecting to lobby...');
        onLeaveTable();
      }, 5000); // 5 second delay to see results

      return () => clearTimeout(timeoutId);
    }
  }, [table?.status, table?.gameType, user, onLeaveTable]);

  // Calculate betting info
  const getBettingInfo = () => {
    if (!gameState || !currentPlayer) return null;

    const currentBet = gameState.currentBet;
    const playerCurrentBet = currentPlayer.currentBet;
    const callAmount = currentBet - playerCurrentBet;
    const canCheck = callAmount === 0;
    const canCall = callAmount > 0 && callAmount <= currentPlayer.chips;

    const raiseAction = availableActions?.actions.find(a => a.action === 'raise');
    const minRaise = raiseAction?.minAmount || 0;
    const maxRaise = raiseAction?.maxAmount || currentPlayer.chips;

    return {
      currentBet,
      callAmount,
      canCheck,
      canCall,
      minRaise,
      maxRaise,
      playerChips: currentPlayer.chips,
    };
  };

  // Get pot odds - memoized
  const getPotOdds = useMemo(() => {
    if (!gameState || !currentPlayer) return null;

    const callAmount = gameState.currentBet - currentPlayer.currentBet;
    const potSize = gameState.pot;
    
    if (callAmount === 0) return null;
    
    const potOdds = potSize / callAmount;
    const percentage = (callAmount / (potSize + callAmount)) * 100;
    
    return {
      ratio: `${potOdds.toFixed(1)}:1`,
      percentage: `${percentage.toFixed(1)}%`,
    };
  }, [gameState?.currentBet, gameState?.pot, currentPlayer?.currentBet]);

  // Get hand strength (simplified) - memoized
  const getHandStrength = useMemo(() => {
    if (!currentPlayer || !gameState) return null;

    const holeCards = currentPlayer.cards;
    const communityCards = gameState.communityCards;
    
    // This is a simplified version - in a real app, you'd use proper hand evaluation
    const allCards = [...holeCards, ...communityCards];
    
    if (allCards.length < 2) return null;
    
    // Basic hand strength categories
    const hasAce = allCards.some(card => card.startsWith('A'));
    const hasKing = allCards.some(card => card.startsWith('K'));
    const hasPair = holeCards[0]?.charAt(0) === holeCards[1]?.charAt(0);
    
    if (hasPair) return 'Strong';
    if (hasAce && hasKing) return 'Good';
    if (hasAce || hasKing) return 'Medium';
    return 'Weak';
  }, [currentPlayer?.cards, gameState?.communityCards]);

  // Game statistics - memoized
  const getGameStats = useMemo(() => {
    if (!players || !gameState) return null;

    const activePlayers = players.filter(p => !p.isFolded);
    const totalChips = players.reduce((sum, p) => sum + p.chips, 0);
    const averageChips = totalChips / players.length;
    
    return {
      totalPlayers: players.length,
      activePlayers: activePlayers.length,
      totalChips,
      averageChips,
      potSize: gameState.pot,
      bigBlind: gameState.currentBet,
    };
  }, [players, gameState]);

  // handleTimeOut already declared above

  const handleStartNextHand = useCallback(async () => {
    if (!tableId) return;
    
    setIsProcessing(true);
    try {
      // For now, we'll use startGame to start next hand
      // This will be improved when we have proper next hand logic
      await startGame({ tableId });
      
      // Clear action history for new hand
      setActionHistory([]);
      
      // Add new hand message
      addActionToHistory({
        id: `${Date.now()}-system-newhand`,
        playerName: 'Système',
        action: 'system',
        message: `Nouvelle main #${handNumber + 1}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to start next hand:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [tableId, startGame, handNumber, addActionToHistory]);

  // addActionToHistory already declared above

  return {
    // Game state
    table,
    gameState,
    players,
    currentPlayer,
    isMyTurn,
    isProcessing,
    
    // Available actions
    availableActions: availableActions?.actions || [],
    showdownResults,
    
    // Action handlers
    handleStartGame,
    handleStartNextHand,
    handlePlayerAction,
    handleFold,
    handleCheck,
    handleCall,
    handleRaise,
    handleAllIn,
    handleTimeOut,
    handleAdvancePhase: async () => {
      if (!tableId) return;
      try {
        setIsProcessing(true);
        
        // Use different mutation based on current phase
        if (gameState?.phase === 'showdown') {
          await advanceFromShowdown({ tableId });
        } else {
          await advancePhase({ tableId });
        }
      } catch (error) {
        console.error('Error advancing phase:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    
    // Betting utilities
    getBettingInfo,
    getPotOdds: () => getPotOdds, // Wrapper function to maintain API compatibility
    getHandStrength: () => getHandStrength,
    getGameStats: () => getGameStats,
    
    // Game tracking
    actionHistory: serverActions || [],
    handNumber,
    addActionToHistory,
    
    // UI state
    selectedAction,
    setSelectedAction,
    raiseAmount,
    setRaiseAmount,
  };
};