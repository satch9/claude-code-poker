import { useState, useEffect } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface GameAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export const useGameLogic = (tableId: Id<'tables'>) => {
  const { isAuthenticated } = useConvexAuth();
  const [selectedAction, setSelectedAction] = useState<GameAction | null>(null);
  const [raiseAmount, setRaiseAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [handNumber, setHandNumber] = useState(1);

  // Mutations
  const startGame = useMutation(api.core.gameEngine.startGame);
  const startNextHand = useMutation(api.core.gameEngine.startNextHand);
  const playerAction = useMutation(api.core.gameEngine.playerAction);
  const forcePlayerFold = useMutation(api.core.gameEngine.forcePlayerFold);

  // Queries
  const user = useQuery(api.users.getCurrentUser);
  const table = useQuery(api.tables.getTable, { tableId });
  const gameState = useQuery(api.tables.getGameState, { tableId });
  const players = useQuery(api.tables.getTablePlayers, { tableId });
  const availableActions = useQuery(
    api.core.gameEngine.getAvailableActions,
    user ? { tableId, userId: user._id } : 'skip'
  );

  // Game state helpers
  const isGameActive = gameState?.phase !== 'waiting';
  const isMyTurn = user && gameState?.currentPlayerPosition === 
    players?.find(p => p.userId === user._id)?.seatPosition;
  const currentPlayer = players?.find(p => p.userId === user?._id);

  // Action handlers
  const handleStartGame = async () => {
    if (!isAuthenticated || !user) return;
    
    setIsProcessing(true);
    try {
      await startGame({ tableId });
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNextHand = async () => {
    if (!isAuthenticated || !user) return;
    
    setIsProcessing(true);
    try {
      await startNextHand({ tableId });
      setHandNumber(prev => prev + 1);
    } catch (error) {
      console.error('Failed to start next hand:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayerAction = async (action: GameAction) => {
    if (!isAuthenticated || !user || !isMyTurn) return;
    
    setIsProcessing(true);
    try {
      await playerAction({
        tableId,
        userId: user._id,
        action: action.action,
        amount: action.amount,
      });
      
      // Add action to history
      const playerName = user.name || 'Vous';
      addActionToHistory(playerName, action.action, action.amount);
      
      setSelectedAction(null);
      setRaiseAmount(0);
    } catch (error) {
      console.error('Failed to perform action:', error);
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

  // Track action history - only track actual new actions, not all players with lastAction
  useEffect(() => {
    if (!players || !gameState) return;

    // Track phase changes
    const currentPhase = gameState.phase;
    if (currentPhase === 'preflop' && actionHistory.length === 0) {
      setActionHistory([{
        id: `phase-${currentPhase}-${Date.now()}`,
        playerName: 'Système',
        action: 'join' as any,
        timestamp: Date.now(),
      }]);
    }
  }, [gameState?.phase]);

  // Track when actions are performed by updating history only on successful actions
  const addActionToHistory = (playerName: string, action: string, amount?: number) => {
    const newAction = {
      id: `${playerName}-${action}-${Date.now()}-${Math.random()}`,
      playerName,
      action: action as any,
      amount,
      timestamp: Date.now(),
    };

    setActionHistory(prev => {
      const updated = [newAction, ...prev].slice(0, 10); // Keep only last 10
      return updated;
    });
  };

  // Auto-fold on timeout (30 seconds)
  useEffect(() => {
    if (!isMyTurn || !user) return;

    const timeoutId = setTimeout(() => {
      forcePlayerFold({ tableId, userId: user._id });
    }, 30000); // 30 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [isMyTurn, user, tableId, forcePlayerFold]);

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
  const handleTimeOut = () => {
    if (user && isMyTurn) {
      forcePlayerFold({ tableId, userId: user._id });
    }
  };

  return {
    // Game state
    table,
    gameState,
    players,
    currentPlayer,
    isGameActive,
    isMyTurn,
    isProcessing,
    
    // Available actions
    availableActions: availableActions?.actions || [],
    
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