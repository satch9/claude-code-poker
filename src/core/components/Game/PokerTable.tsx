import React, { useState } from "react";
import { PlayerSeat } from "./PlayerSeat";
import { CommunityCards } from "./CommunityCards";
import { BettingControls } from "./BettingControls";
import { ActionFeed } from "./ActionFeed";
import { ActionTimer } from "./ActionTimer";
import { HandStats } from "./HandStats";
import { TurnIndicator } from "./TurnIndicator";
import { ShowdownResults } from "./ShowdownResults";
import { Button } from "../UI/Button";
import { LandscapeWarning } from "../UI/LandscapeWarning";
import { cn } from "../../../shared/utils/cn";
import { useGameLogic } from "../../hooks/useGameLogic";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { Id } from "../../../../convex/_generated/dataModel";

interface PokerTableProps {
  tableId: Id<"tables"> | null;
  appTitle: string;
  onLeaveTable: () => void;
  onJoinSeat: (position: number) => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  tableId,
  appTitle,
  onLeaveTable,
  onJoinSeat,
}) => {
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Use hooks
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  
  // Use game logic hook
  const {
    table,
    gameState,
    players,
    currentPlayer,
    isMyTurn,
    isProcessing,
    availableActions,
    handleStartGame,
    handlePlayerAction,
    getPotOdds,
    getHandStrength,
    getGameStats,
    actionHistory,
    handNumber,
    handleTimeOut,
    showdownResults,
  } = useGameLogic(tableId, onLeaveTable);

  // Early return if no tableId or no data
  if (!tableId || !gameState || !players || !table) {
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
  const potOdds = getPotOdds();
  const handStrength = getHandStrength();
  const gameStats = getGameStats();
  const currentBet = gameState?.currentBet || 0;

  // Calculate seat positions for oval table (optimized for 9 players)
  const getSeatPosition = (position: number, maxPlayers: number) => {
    const angle = (position / maxPlayers) * 2 * Math.PI - Math.PI / 2;
    
    // Radius ajusté pour éviter les débordements
    const radiusX = isMobile ? 40 : 45; // Horizontal radius percentage (réduit)
    const radiusY = isMobile ? 32 : 35; // Vertical radius percentage (réduit)

    // Calculer la position avec contraintes pour éviter les débordements
    const rawX = 50 + radiusX * Math.cos(angle);
    const rawY = 50 + radiusY * Math.sin(angle);
    
    // Contraindre dans les limites visibles (15-85% pour laisser de la marge)
    const x = Math.max(15, Math.min(85, rawX));
    const y = Math.max(15, Math.min(85, rawY));

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
    };
  };

  // Calculate dealer button position (in front of player seat)
  const getDealerButtonPosition = (position: number, maxPlayers: number) => {
    const angle = (position / maxPlayers) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 38; // Closer to center than player seat
    const radiusY = 28; // Closer to center than player seat

    const x = 50 + radiusX * Math.cos(angle);
    const y = 50 + radiusY * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
    };
  };

  // Create array of all seat positions
  const seats = Array.from({ length: table.maxPlayers }, (_, position) => {
    const player = players.find((p) => p.seatPosition === position && p.user);
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
    if (!players || !gameState || !table) return 0;
    if (players.length === 2) {
      return gameState.dealerPosition; // In heads-up, dealer is small blind
    }
    return (gameState.dealerPosition + 1) % table.maxPlayers;
  }

  function getBigBlindPosition() {
    if (!players || !gameState || !table) return 0;
    if (players.length === 2) {
      return (gameState.dealerPosition + 1) % table.maxPlayers;
    }
    return (gameState.dealerPosition + 2) % table.maxPlayers;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex flex-col overflow-hidden">
      {/* Landscape Warning for mobile portrait */}
      <LandscapeWarning />
      {/* Header - hidden on mobile */}
      {!isMobile && (
        <div className="flex justify-between items-center border-b border-poker-green-700 flex-shrink-0 p-4">
          <div className="text-white">
            <h1 className="text-2xl font-bold">{appTitle} - {table.name}</h1>
            <p className="text-sm text-poker-green-200">
              {table.gameType === "tournament" ? "Tournoi" : "Cash Game"} •
              Blinds: {table.smallBlind}/{table.bigBlind}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Start game button in header - only for first game */}
            {gameState.phase === "waiting" &&
              table.status === "waiting" &&
              players.length >= 2 &&
              currentPlayer && (
                <Button
                  onClick={handleStartGame}
                  disabled={isProcessing}
                  size="md"
                  variant="primary"
                >
                  {isProcessing ? "Démarrage..." : "Démarrer la partie"}
                </Button>
              )}
            
            <Button variant="secondary" onClick={onLeaveTable}>
              Quitter la table
            </Button>
          </div>
        </div>
      )}

      {/* Main content - responsive layout */}
      <div className={cn(
        "flex flex-1",
        isMobile ? "overflow-hidden" : "overflow-x-auto"
      )} style={!isMobile ? { minWidth: "1200px" } : {}}>
        
        {/* Left sidebar - Actions (desktop/tablet only) */}
        {!isMobile && (
          <div className={cn(
            "flex-shrink-0 p-4 border-r border-poker-green-700 space-y-4 overflow-y-auto",
            isTablet ? "w-60" : "w-80"
          )}>
            <ActionFeed actions={actionHistory} />

            <TurnIndicator
              currentPhase={gameState.phase}
              currentPlayerPosition={gameState.currentPlayerPosition}
              dealerPosition={gameState.dealerPosition}
              isMyTurn={isMyTurn || false}
              playerName={
                players.find(
                  (p) => p.seatPosition === gameState.currentPlayerPosition
                )?.user?.name || ""
              }
            />

            {gameStats && (
              <HandStats
                handNumber={handNumber}
                potSize={gameState.pot}
                totalPlayers={players.length}
                activePlayers={players.filter((p) => !p.isFolded).length}
                bigBlind={table.bigBlind}
                averageStack={gameStats.averageChips}
              />
            )}
          </div>
        )}

        {/* Center - Table */}
        <div className={cn(
          "flex-1 flex flex-col items-center",
          isMobile ? "p-2 pb-20" : "p-4"
        )} style={!isMobile ? { maxWidth: isTablet ? "calc(100% - 480px)" : "calc(100% - 640px)" } : {}}>
          
          {/* Main table area - fullscreen on mobile */}
          <div className={cn(
            "relative w-full",
            isMobile ? "h-full max-w-none" : "max-w-4xl h-[700px]"
          )}>
            {/* Table shadow */}
            <div className="absolute inset-2 bg-black/20 rounded-full blur-xl"></div>

            {/* Table felt */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-800 rounded-full shadow-2xl"
              style={{
                border: "12px solid transparent",
                backgroundImage:
                  "linear-gradient(to bottom right, #10b981, #059669, #047857), linear-gradient(45deg, #f59e0b, #d97706, #92400e, #d97706, #f59e0b)",
                backgroundOrigin: "padding-box, border-box",
                backgroundClip: "padding-box, border-box",
              }}
            >
              {/* Table texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/30 rounded-full"></div>

              {/* Enhanced felt texture */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundImage: `
                       radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                       radial-gradient(circle at 75% 75%, rgba(0,0,0,0.1) 0%, transparent 50%),
                       linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.02) 50%, transparent 60%)
                     `,
                }}
              ></div>

              {/* Inner decorative rings */}
              <div
                className="absolute inset-6 border-2 rounded-full"
                style={{ borderColor: "rgba(245, 158, 11, 0.3)" }}
              ></div>
              <div
                className="absolute inset-8 border rounded-full"
                style={{ borderColor: "rgba(245, 158, 11, 0.2)" }}
              ></div>

              {/* Center area with community cards */}
              <div className={cn(
                "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center",
                isMobile && "scale-75"
              )}>
                {/* Community cards */}
                <CommunityCards
                  cards={gameState.communityCards}
                  phase={gameState.phase}
                  pot={gameState.pot}
                />
              </div>

              {/* Dealer button */}
              {gameState.dealerPosition >= 0 && (
                <div
                  className={cn(
                    "absolute z-20 bg-gradient-to-br from-white to-gray-100 border-3 border-gray-700 rounded-full flex items-center justify-center font-black text-gray-800 shadow-xl transition-all duration-500",
                    isMobile ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
                  )}
                  style={{
                    ...getDealerButtonPosition(
                      gameState.dealerPosition,
                      table.maxPlayers
                    ),
                    boxShadow:
                      "0 8px 25px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)",
                  }}
                >
                  <span className="drop-shadow-sm">D</span>
                </div>
              )}


              {/* Player seats around the table */}
              {seats.map((seat) => (
                <div
                  key={seat.position}
                  className={cn(
                    "absolute",
                    isMobile ? "z-30" : "z-10"
                  )}
                  style={getSeatPosition(seat.position, table.maxPlayers)}
                >
                  <PlayerSeat
                    player={seat.player as any}
                    position={seat.position}
                    isDealer={seat.isDealer}
                    isCurrentPlayer={seat.isCurrentPlayer}
                    isActivePlayer={seat.isActivePlayer}
                    isSmallBlind={seat.isSmallBlind}
                    isBigBlind={seat.isBigBlind}
                    smallBlindAmount={table.smallBlind}
                    bigBlindAmount={table.bigBlind}
                    showCards={
                      seat.isCurrentPlayer || gameState.phase === "showdown"
                    }
                    isEmpty={seat.isEmpty}
                    onSeatClick={() =>
                      seat.isEmpty && onJoinSeat(seat.position)
                    }
                    onTimeOut={seat.isActivePlayer && gameState.phase !== "waiting" ? handleTimeOut : undefined}
                    timeLimit={30}
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
                    <div
                      key={index}
                      className="text-sm text-gray-700 py-1 flex justify-between"
                    >
                      <span>Pot {index + 1}:</span>
                      <span className="font-semibold">
                        {pot.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}


              {/* Game info button */}
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setShowGameInfo(!showGameInfo)}
                  className="w-12 h-12 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-white/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Betting controls below table (outside of table container) */}
          {currentPlayer &&
            isMyTurn &&
            gameState.phase !== "waiting" &&
            availableActions.length > 0 && (
              <div className={cn(
                "w-full",
                isMobile ? "mt-2 max-w-none" : "mt-6 max-w-4xl"
              )}>
                <BettingControls
                  availableActions={availableActions as any}
                  playerChips={currentPlayer.chips}
                  currentBet={gameState.currentBet}
                  potSize={gameState.pot}
                  onAction={handlePlayerAction}
                  disabled={isProcessing}
                  potOdds={potOdds?.ratio || undefined}
                  handStrength={handStrength || undefined}
                />
              </div>
            )}
        </div>

        {/* Right sidebar - Chat and features (desktop/tablet only) */}
        {!isMobile && (
          <div className={cn(
            "flex-shrink-0 p-4 border-l border-poker-green-700 space-y-4 overflow-y-auto",
            isTablet ? "w-60" : "w-80"
          )}>
          {/* Chat placeholder */}
          <div className="bg-poker-green-800/50 rounded-lg p-4 border border-poker-green-600">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-4.126-.98L3 20l1.98-5.874A8.955 8.955 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z"
                />
              </svg>
              Chat
            </h3>
            <div className="text-poker-green-200 text-sm">
              <div className="bg-poker-green-900/50 rounded p-2 mb-2">
                Chat sera disponible prochainement
              </div>
            </div>
          </div>

          {/* Table settings placeholder */}
          <div className="bg-poker-green-800/50 rounded-lg p-4 border border-poker-green-600">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Paramètres
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left text-poker-green-200 hover:text-white text-sm py-1 px-2 rounded hover:bg-poker-green-700/50 transition-colors">
                Sons et notifications
              </button>
              <button className="w-full text-left text-poker-green-200 hover:text-white text-sm py-1 px-2 rounded hover:bg-poker-green-700/50 transition-colors">
                Animations
              </button>
              <button className="w-full text-left text-poker-green-200 hover:text-white text-sm py-1 px-2 rounded hover:bg-poker-green-700/50 transition-colors">
                Affichage
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-poker-green-800/50 rounded-lg p-4 border border-poker-green-600">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Actions rapides
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowGameInfo(true)}
                className="w-full text-left text-poker-green-200 hover:text-white text-sm py-2 px-3 rounded hover:bg-poker-green-700/50 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Infos de la partie
              </button>
              <button className="w-full text-left text-poker-green-200 hover:text-white text-sm py-2 px-3 rounded hover:bg-poker-green-700/50 transition-colors flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
                Inviter des joueurs
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Mobile bottom menu - fixed navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-poker-green-800/95 backdrop-blur-sm border-t border-poker-green-600">
            <div className="flex items-center justify-around py-2 px-4">
              {/* Menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex flex-col items-center gap-1 p-2 text-white hover:text-poker-green-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-xs">Menu</span>
              </button>

              {/* Game info button */}
              <button
                onClick={() => setShowGameInfo(!showGameInfo)}
                className="flex flex-col items-center gap-1 p-2 text-white hover:text-poker-green-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs">Info</span>
              </button>

              {/* Phase indicator */}
              <div className="flex flex-col items-center gap-1 p-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  gameState.phase === "waiting" && "bg-gray-400",
                  gameState.phase === "preflop" && "bg-blue-400",
                  gameState.phase === "flop" && "bg-green-400",
                  gameState.phase === "turn" && "bg-yellow-400",
                  gameState.phase === "river" && "bg-orange-400",
                  gameState.phase === "showdown" && "bg-purple-400"
                )}></div>
                <span className="text-xs text-white capitalize">{gameState.phase}</span>
              </div>

              {/* Start game or leave button */}
              {gameState.phase === "waiting" && table.status === "waiting" && players.length >= 2 && currentPlayer ? (
                <button
                  onClick={handleStartGame}
                  disabled={isProcessing}
                  className="flex flex-col items-center gap-1 p-2 text-poker-green-200 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M10 19a9 9 0 100-18 9 9 0 000 18z" />
                  </svg>
                  <span className="text-xs">{isProcessing ? "..." : "Start"}</span>
                </button>
              ) : (
                <button
                  onClick={onLeaveTable}
                  className="flex flex-col items-center gap-1 p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xs">Quit</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile menu modal */}
        {isMobile && showMobileMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />

            {/* Modal content */}
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 w-full max-w-sm mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Menu</h3>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowGameInfo(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Infos de la partie
                </button>
                
                {gameStats && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Statistiques</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Main #{handNumber}</div>
                      <div>Pot: {gameState.pot.toLocaleString()}</div>
                      <div>Joueurs: {players.filter((p) => !p.isFolded).length}/{players.length}</div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    onLeaveTable();
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-3 text-red-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Quitter la table
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Showdown Results Modal */}
        {showdownResults && (
          <ShowdownResults
            results={showdownResults.results}
            pot={showdownResults.pot}
            communityCards={showdownResults.communityCards}
            onContinue={() => {
              // This will be handled by the prepareNextHand mutation
              window.location.reload(); // Temporary solution
            }}
          />
        )}

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
                <h3 className="text-lg font-bold text-gray-900">
                  Informations de la partie
                </h3>
                <button
                  onClick={() => setShowGameInfo(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {/* Players count */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">
                    Joueurs connectés
                  </span>
                  <span className="font-semibold text-gray-900">
                    {players.length}/{table.maxPlayers}
                  </span>
                </div>

                {/* Game phase */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">
                    Phase actuelle
                  </span>
                  <span
                    className={cn(
                      "font-semibold px-3 py-1 rounded-full text-sm",
                      gameState.phase === "waiting" &&
                        "bg-gray-200 text-gray-700",
                      gameState.phase === "preflop" &&
                        "bg-blue-200 text-blue-700",
                      gameState.phase === "flop" &&
                        "bg-green-200 text-green-700",
                      gameState.phase === "turn" &&
                        "bg-yellow-200 text-yellow-700",
                      gameState.phase === "river" &&
                        "bg-orange-200 text-orange-700",
                      gameState.phase === "showdown" &&
                        "bg-purple-200 text-purple-700"
                    )}
                  >
                    {gameState.phase.toUpperCase()}
                  </span>
                </div>

                {/* Current bet */}
                {currentBet > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">
                      Mise actuelle
                    </span>
                    <span className="font-semibold text-red-600">
                      {currentBet.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Blinds */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Blinds</span>
                  <span className="font-semibold text-gray-900">
                    {table.smallBlind}/{table.bigBlind}
                  </span>
                </div>

                {/* Table type */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">
                    Type de partie
                  </span>
                  <span
                    className={cn(
                      "font-semibold px-3 py-1 rounded-full text-sm",
                      table.gameType === "tournament"
                        ? "bg-purple-200 text-purple-700"
                        : "bg-green-200 text-green-700"
                    )}
                  >
                    {table.gameType === "tournament" ? "TOURNOI" : "CASH GAME"}
                  </span>
                </div>

                {/* Pot amount */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 font-medium">Pot total</span>
                  <span className="font-bold text-green-600 text-lg">
                    {gameState.pot.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
