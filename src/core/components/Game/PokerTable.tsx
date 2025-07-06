import React, { useState } from 'react';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { BettingControls } from './BettingControls';
import { Button } from '../UI/Button';
import { Player, GameState, Table, User } from '../../../shared/types';
import { cn } from '../../../shared/utils/cn';

interface PokerTableProps {
  table: Table;
  players: Player[];
  gameState: GameState;
  currentUser: User;
  onLeaveTable: () => void;
  onPlayerAction: (action: string, amount?: number) => void;
  onJoinSeat: (position: number) => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  table,
  players,
  gameState,
  currentUser,
  onLeaveTable,
  onPlayerAction,
  onJoinSeat,
}) => {
  const [showControls, setShowControls] = useState(true);

  // Get current player
  const currentPlayer = players.find(p => p.userId === currentUser._id);
  const isCurrentPlayerTurn = currentPlayer && gameState.currentPlayerPosition === currentPlayer.seatPosition;

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
      isCurrentPlayer: player?.userId === currentUser._id,
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

  // Betting logic
  const currentBet = gameState.currentBet;
  const playerCurrentBet = currentPlayer?.currentBet || 0;
  const callAmount = currentBet - playerCurrentBet;
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && callAmount < (currentPlayer?.chips || 0);
  const minRaise = currentBet + table.bigBlind;
  const maxBet = (currentPlayer?.chips || 0) + playerCurrentBet;

  const handlePlayerAction = (action: string, amount?: number) => {
    onPlayerAction(action, amount);
    if (action === 'fold') {
      setShowControls(false);
    }
  };

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
        <div className="relative w-full h-[600px] mx-auto">
          {/* Table felt */}
          <div className="absolute inset-0 bg-gradient-to-br from-poker-green-600 to-poker-green-700 rounded-full border-8 border-poker-gold-600 shadow-2xl">
            
            {/* Community cards in center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <CommunityCards
                cards={gameState.communityCards}
                phase={gameState.phase}
                pot={gameState.pot}
              />
            </div>

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
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Side Pots</div>
                {gameState.sidePots.map((pot, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    Pot {index + 1}: {pot.amount.toLocaleString()}
                  </div>
                ))}
              </div>
            )}

            {/* Game info */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div className="font-medium text-gray-700">Joueurs: {players.length}/{table.maxPlayers}</div>
                <div className="text-gray-600">Phase: {gameState.phase}</div>
                {currentBet > 0 && (
                  <div className="text-gray-600">Mise actuelle: {currentBet.toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Betting controls */}
        {currentPlayer && isCurrentPlayerTurn && showControls && gameState.phase !== 'waiting' && (
          <div className="mt-6">
            <BettingControls
              currentBet={currentBet}
              minRaise={minRaise}
              maxBet={maxBet}
              playerChips={currentPlayer.chips}
              canCheck={canCheck}
              canCall={canCall}
              callAmount={callAmount}
              onFold={() => handlePlayerAction('fold')}
              onCheck={() => handlePlayerAction('check')}
              onCall={() => handlePlayerAction('call')}
              onRaise={(amount) => handlePlayerAction('raise', amount)}
              onAllIn={() => handlePlayerAction('all-in')}
            />
          </div>
        )}

        {/* Waiting for other players */}
        {gameState.phase === 'waiting' && (
          <div className="mt-6 text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 inline-block">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                En attente de joueurs
              </h3>
              <p className="text-gray-600 mb-4">
                {players.length < 2 
                  ? 'Au moins 2 joueurs sont nécessaires pour commencer'
                  : 'La partie peut commencer dès maintenant'
                }
              </p>
              {players.length >= 2 && !currentPlayer && (
                <p className="text-orange-600 font-medium">
                  Rejoignez un siège pour participer à la partie
                </p>
              )}
            </div>
          </div>
        )}

        {/* Not in game message */}
        {!currentPlayer && gameState.phase !== 'waiting' && (
          <div className="mt-6 text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 inline-block">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Spectateur
              </h3>
              <p className="text-gray-600">
                Vous regardez la partie. Attendez la fin de la main pour rejoindre.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};