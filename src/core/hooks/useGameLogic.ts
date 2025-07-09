import { useState, useEffect } from 'react';
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

export const useGameLogic = (tableId: Id<'tables'> | null) => {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<GameAction | null>(null);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [handNumber, setHandNumber] = useState(1);

  // Mutations
  const startGame = useMutation(api.core.gameEngine.startGame);
  const playerAction = useMutation(api.core.gameEngine.playerAction);

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
  // Temporarily disable showdown results until Convex redeploys
  const showdownResults = null;
  // const showdownResults = useQuery(
  //   api.core.gameEngine.getShowdownResults,
  //   tableId && gameState?.phase === 'showdown' ? { tableId } : 'skip'
  // );

  // Game state helpers
  const isMyTurn = user && gameState?.currentPlayerPosition === 
    players?.find(p => p.userId === user._id)?.seatPosition;
  const currentPlayer = players?.find(p => p.userId === user?._id);

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


  const handlePlayerAction = async (action: GameAction) => {
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
  };

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

  // Auto-fold on timeout (30 seconds)
  useEffect(() => {
    if (!isMyTurn || !user || !tableId) return;

    const timeoutId = setTimeout(() => {
      handleTimeOut();
    }, 30000); // 30 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [isMyTurn, user, tableId]);

  // Track hand number
  useEffect(() => {
    if (gameState?.phase === 'preflop' && gameState?.pot === 0) {
      setHandNumber(prev => prev + 1);
    }
  }, [gameState?.phase, gameState?.pot]);

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

  // Get pot odds
  const getPotOdds = () => {
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
  };

  // Get hand strength (simplified)
  const getHandStrength = () => {
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
  };

  // Game statistics
  const getGameStats = () => {
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
  };

  // Handle timeout
  const handleTimeOut = async () => {
    if (!user || !tableId) return;
    
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
  };

  const handleStartNextHand = async () => {
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
  };

  const addActionToHistory = (actionData: {
    id: string;
    playerName: string;
    action: string;
    amount?: number;
    message?: string;
    timestamp: number;
    isTimeout?: boolean;
  }) => {
    setActionHistory(prev => [...prev, actionData]);
  };

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
    
    // Betting utilities
    getBettingInfo,
    getPotOdds,
    getHandStrength,
    getGameStats,
    
    // Game tracking
    actionHistory,
    handNumber,
    addActionToHistory,
    
    // UI state
    selectedAction,
    setSelectedAction,
    raiseAmount,
    setRaiseAmount,
  };
};