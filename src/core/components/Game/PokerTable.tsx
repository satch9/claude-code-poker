import React, { useState } from 'react';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { BettingControls } from './BettingControls';
import { ActionFeed } from './ActionFeed';
import { ActionTimer } from './ActionTimer';
import { HandStats } from './HandStats';
import { TurnIndicator } from './TurnIndicator';
import { Button } from '../UI/Button';
import { Player, GameState, Table, User } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';
import { useGameLogic } from '../../hooks/useGameLogic';
import { Id } from '../../../convex/_generated/dataModel';

interface PokerTableProps {
  tableId: Id<'tables'>;
  onLeaveTable: () => void;
  onJoinSeat: (position: number) => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  tableId,
  onLeaveTable,
  onJoinSeat,
}) => {
  const [showGameInfo, setShowGameInfo] = useState(false);
  
  // Use game logic hook
  const {
    gameState,
    players,
    currentPlayer,
    isGameActive,
    isMyTurn,
    isProcessing,
    availableActions,
    handleStartGame,
    handlePlayerAction,
    getBettingInfo,
    getPotOdds,
    getHandStrength,
    getGameStats,
    actionHistory,
    handNumber,
    handleTimeOut,
    handleStartNextHand,
    addActionToHistory,
  } = useGameLogic(tableId);

  // Early return if no data
  if (!gameState || !players || !table) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 p-4 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading table...</p>
        </div>
      </div>
    );
  }

  // Get game info
  const bettingInfo = getBettingInfo();
  const potOdds = getPotOdds();
  const handStrength = getHandStrength();
  const gameStats = getGameStats();

  // Track phase changes
  React.useEffect(() => {
    if (!gameState) return;
    
    const phaseNames = {
      'preflop': 'Pré-flop',
      'flop': 'Flop',
      'turn': 'Turn', 
      'river': 'River',
      'showdown': 'Abattage'
    };
    
    if (gameState.phase in phaseNames && gameState.phase !== 'waiting') {
      addActionToHistory('Système', 'join', undefined);
    }
  }, [gameState?.phase, addActionToHistory]);

  // Calculate seat positions for oval table
  const getSeatPosition = (position: number, maxPlayers: number) => {
    const angle = (position / maxPlayers) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 45; // Horizontal radius percentage
    const radiusY = 35; // Vertical radius percentage
    
    const x = 50 + radiusX * Math.cos(angle);
    const y = 50 + radiusY * Math.sin(angle);
    
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  // Create array of all seat positions
  const seats = Array.from({ length: table.maxPlayers }, (_, position) => {
    const player = players.find(p => p.seatPosition === position);
    const isEmpty = !player;
    
    return {
      position,
      player,
      isEmpty,
      isDealer: gameState.dealerPosition === position,
      isCurrentPlayer: player?.userId === currentPlayer?.userId,
      isSmallBlind: getSmallBlindPosition() === position,
      isBigBlind: getBigBlindPosition() === position,
      isActivePlayer: gameState.currentPlayerPosition === position,
    };
  });

  function getSmallBlindPosition() {
    if (players.length === 2) {
      return gameState.dealerPosition; // In heads-up, dealer is small blind
    }
    return (gameState.dealerPosition + 1) % table.maxPlayers;
  }

  function getBigBlindPosition() {
    if (players.length === 2) {
      return (gameState.dealerPosition + 1) % table.maxPlayers;
    }
    return (gameState.dealerPosition + 2) % table.maxPlayers;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-white">
            <h1 className="text-2xl font-bold">{table.name}</h1>
            <p className="text-poker-green-200">
              {table.gameType === 'tournament' ? 'Tournoi' : 'Cash Game'} • 
              Blinds: {table.smallBlind}/{table.bigBlind}
            </p>
          </div>
          <Button variant="secondary" onClick={onLeaveTable}>
            Quitter la table
          </Button>
        </div>

        {/* Main table area */}
        <div className="relative w-full h-[700px] mx-auto">
          {/* Table shadow */}
          <div className="absolute inset-2 bg-black/20 rounded-full blur-xl"></div>
          
          {/* Table felt */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 rounded-full border-8 border-amber-400 shadow-2xl overflow-hidden">
            {/* Table texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-full"></div>
            
            {/* Inner border design */}
            <div className="absolute inset-4 border-2 border-amber-300/30 rounded-full"></div>
            <div className="absolute inset-6 border border-amber-200/20 rounded-full"></div>
            
            {/* Community cards in center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <CommunityCards
                  cards={gameState.communityCards}
                  phase={gameState.phase}
                  pot={gameState.pot}
                />
              </div>
            </div>

            {/* Dealer button */}
            {gameState.dealerPosition >= 0 && (
              <div 
                className="absolute z-30 w-8 h-8 bg-white border-2 border-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-800 shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                style={getSeatPosition(gameState.dealerPosition, table.maxPlayers)}
              >
                D
              </div>
            )}

            {/* Action indicator */}
            {gameState.currentPlayerPosition >= 0 && (
              <div 
                className="absolute z-25 w-16 h-8 bg-yellow-400 border-2 border-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-gray-900 shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{
                  ...getSeatPosition(gameState.currentPlayerPosition, table.maxPlayers),
                  top: `${parseFloat(getSeatPosition(gameState.currentPlayerPosition, table.maxPlayers).top) - 8}%`
                }}
              >
                À JOUER
              </div>
            )}

            {/* Player seats around the table */}
            {seats.map((seat) => (
              <div
                key={seat.position}
                className="absolute"
                style={getSeatPosition(seat.position, table.maxPlayers)}
              >
                <PlayerSeat
                  player={seat.player}
                  position={seat.position}
                  isDealer={seat.isDealer}
                  isCurrentPlayer={seat.isCurrentPlayer}
                  isSmallBlind={seat.isSmallBlind}
                  isBigBlind={seat.isBigBlind}
                  showCards={seat.isCurrentPlayer || gameState.phase === 'showdown'}
                  isEmpty={seat.isEmpty}
                  onSeatClick={() => seat.isEmpty && onJoinSeat(seat.position)}
                  className={cn(
                    seat.isActivePlayer && 'ring-2 ring-yellow-400 ring-opacity-75',
                    'transition-all duration-300'
                  )}
                />
              </div>
            ))}

            {/* Side pots indicator */}
            {gameState.sidePots.length > 0 && (
              <div className="absolute top-4 left-4 bg-gradient-to-br from-white/95 to-gray-100/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/50">
                <div className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Side Pots
                </div>
                {gameState.sidePots.map((pot, index) => (
                  <div key={index} className="text-sm text-gray-700 py-1 flex justify-between">
                    <span>Pot {index + 1}:</span>
                    <span className="font-semibold">{pot.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Timer (for current player) */}
            {isMyTurn && gameState.phase !== 'waiting' && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                <ActionTimer
                  isActive={true}
                  timeLimit={30}
                  onTimeOut={handleTimeOut}
                />
              </div>
            )}

            {/* Game info button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setShowGameInfo(!showGameInfo)}
                className="w-12 h-12 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-white/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Game info modal */}
        {showGameInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setShowGameInfo(false)}
            />
            
            {/* Modal content */}
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 min-w-80 max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Informations de la partie</h3>
                <button
                  onClick={() => setShowGameInfo(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {/* Players count */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Joueurs connectés</span>
                  <span className="font-semibold text-gray-900">{players.length}/{table.maxPlayers}</span>
                </div>
                
                {/* Game phase */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Phase actuelle</span>
                  <span className={cn(
                    "font-semibold px-3 py-1 rounded-full text-sm",
                    gameState.phase === 'waiting' && "bg-gray-200 text-gray-700",
                    gameState.phase === 'preflop' && "bg-blue-200 text-blue-700",
                    gameState.phase === 'flop' && "bg-green-200 text-green-700",
                    gameState.phase === 'turn' && "bg-yellow-200 text-yellow-700",
                    gameState.phase === 'river' && "bg-orange-200 text-orange-700",
                    gameState.phase === 'showdown' && "bg-purple-200 text-purple-700"
                  )}>
                    {gameState.phase.toUpperCase()}
                  </span>
                </div>
                
                {/* Current bet */}
                {currentBet > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Mise actuelle</span>
                    <span className="font-semibold text-red-600">{currentBet.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Blinds */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Blinds</span>
                  <span className="font-semibold text-gray-900">{table.smallBlind}/{table.bigBlind}</span>
                </div>
                
                {/* Table type */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Type de partie</span>
                  <span className={cn(
                    "font-semibold px-3 py-1 rounded-full text-sm",
                    table.gameType === 'tournament' ? "bg-purple-200 text-purple-700" : "bg-green-200 text-green-700"
                  )}>
                    {table.gameType === 'tournament' ? 'TOURNOI' : 'CASH GAME'}
                  </span>
                </div>
                
                {/* Pot amount */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 font-medium">Pot total</span>
                  <span className="font-bold text-green-600 text-lg">{gameState.pot.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start game button */}
        {gameState.phase === 'waiting' && players.length >= 2 && currentPlayer && (
          <div className="mt-6 text-center space-y-3">
            <Button
              onClick={handleStartGame}
              disabled={isProcessing}
              size="lg"
              variant="primary"
            >
              {isProcessing ? 'Démarrage...' : 'Démarrer la partie'}
            </Button>
            
            {/* Start next hand button (if a game was already played) */}
            {handNumber > 1 && (
              <div className="flex items-center justify-center gap-3">
                <div className="text-sm text-gray-400">ou</div>
                <Button
                  onClick={handleStartNextHand}
                  disabled={isProcessing}
                  size="md"
                  variant="secondary"
                >
                  {isProcessing ? 'Démarrage...' : 'Main suivante'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Betting controls */}
        {currentPlayer && isMyTurn && gameState.phase !== 'waiting' && availableActions.length > 0 && (
          <div className="mt-6">
            <BettingControls
              availableActions={availableActions}
              playerChips={currentPlayer.chips}
              currentBet={gameState.currentBet}
              potSize={gameState.pot}
              onAction={handlePlayerAction}
              disabled={isProcessing}
              potOdds={potOdds?.ratio}
              handStrength={handStrength}
            />
          </div>
        )}

        {/* Side panels */}
        <div className="grid grid-cols-3 gap-6 mt-6">
          {/* Left panel - Action Feed */}
          <div>
            <ActionFeed actions={actionHistory} />
          </div>

          {/* Center panel - Turn Indicator */}
          <div>
            <TurnIndicator
              currentPhase={gameState.phase}
              currentPlayerPosition={gameState.currentPlayerPosition}
              dealerPosition={gameState.dealerPosition}
              isMyTurn={isMyTurn}
              playerName={players.find(p => p.seatPosition === gameState.currentPlayerPosition)?.user?.name}
            />
          </div>

          {/* Right panel - Hand Stats */}
          <div>
            {gameStats && (
              <HandStats
                handNumber={handNumber}
                potSize={gameState.pot}
                totalPlayers={players.length}
                activePlayers={players.filter(p => !p.isFolded).length}
                bigBlind={table.bigBlind}
                averageStack={gameStats.averageChips}
              />
            )}
          </div>
        </div>

        {/* Waiting for other players */}
        {gameState.phase === 'waiting' && (
          <div className="mt-8 text-center">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 rounded-2xl p-8 inline-block shadow-xl max-w-md">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-3">
                En attente de joueurs
              </h3>
              <p className="text-blue-700 mb-4 leading-relaxed">
                {players.length < 2 
                  ? 'Au moins 2 joueurs sont nécessaires pour commencer la partie'
                  : 'La partie peut commencer dès maintenant !'
                }
              </p>
              {players.length >= 2 && !currentPlayer && (
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                  <p className="text-orange-800 font-medium text-sm">
                    💺 Rejoignez un siège pour participer à la partie
                  </p>
                </div>
              )}
              {players.length < 2 && (
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Not in game message */}
        {!currentPlayer && gameState.phase !== 'waiting' && (
          <div className="mt-8 text-center">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-8 inline-block shadow-xl max-w-md">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Mode Spectateur
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Vous regardez la partie en cours. Attendez la fin de la main pour rejoindre un siège libre.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};