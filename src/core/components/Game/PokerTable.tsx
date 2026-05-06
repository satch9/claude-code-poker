import React, { useState, useEffect, useMemo } from "react";
import { PlayerSeat } from "./PlayerSeat";
import { CommunityCards } from "./CommunityCards";
import { Card } from "../UI/Card";
import { BettingControls } from "./BettingControls";
import { ActionFeed } from "./ActionFeed";
// import { ActionTimer } from "./ActionTimer"; // Unused
import { HandStats } from "./HandStats";
import { TurnIndicator } from "./TurnIndicator";
import { ShowdownResults } from "./ShowdownResults";
import { Button } from "../UI/Button";
import { LandscapeWarning } from "../UI/LandscapeWarning";
import { cn } from "@/shared/utils/cn";
import { useGameLogic } from "../../hooks/useGameLogic";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useResponsiveClasses, useSeatPositioning } from "../../hooks/useResponsiveClasses";
import { Id } from "../../../../convex/_generated/dataModel";
import { RebuyDialog } from "./RebuyDialog";
import { InviteDialog } from "./InviteDialog";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";

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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false); // Masquée par défaut sur mobile
  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const rebuyMutation = useMutation(api.players.rebuy);
  const { user: authUser } = useAuth();

  // Détection portrait pour layout mobile heads-up
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false
  );
  useEffect(() => {
    const onResize = () =>
      setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Use hooks
  const { isMobile, isTablet, isIOS } = useBreakpoint();
  const responsiveClasses = useResponsiveClasses();
  const seatPositioning = useSeatPositioning();

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

  const isLoading = !tableId || !gameState || !players || !table;

  // Get game info
  const potOdds = getPotOdds();
  const handStrength = getHandStrength();
  const gameStats = getGameStats();
  const currentBet = gameState?.currentBet || 0;

  // Calculate the BASE angle for a seat position (before viewer rotation)
  const getBaseAngle = (position: number, maxPlayers: number): number => {
    let angle: number;

    if (maxPlayers === 2) {
      const angles = isMobile ? [
        Math.PI / 2 + 0.2,
        -Math.PI / 2 - 0.2
      ] : [
        Math.PI / 2,
        -Math.PI / 2
      ];
      angle = angles[position % 2];
    } else if (maxPlayers === 3) {
      const angles = isMobile ? [
        -Math.PI / 2,
        Math.PI * 7 / 6 + 0.1,
        Math.PI / 3 - 0.1
      ] : [
        -Math.PI / 2,
        Math.PI * 7 / 6,
        Math.PI / 3
      ];
      angle = angles[position % 3];
    } else if (maxPlayers === 4) {
      const angles = [
        -Math.PI / 2,
        0,
        Math.PI / 2,
        Math.PI
      ];
      angle = angles[position % 4];
    } else if (maxPlayers === 5) {
      const angles = [
        -Math.PI / 2,
        -Math.PI / 2 + (2 * Math.PI / 5),
        -Math.PI / 2 + (4 * Math.PI / 5),
        -Math.PI / 2 + (6 * Math.PI / 5),
        -Math.PI / 2 + (8 * Math.PI / 5)
      ];
      angle = angles[position % 5];
    } else if (maxPlayers === 6) {
      const angles = [
        -Math.PI / 2,
        -Math.PI / 6,
        Math.PI / 6,
        Math.PI / 2,
        5 * Math.PI / 6,
        -5 * Math.PI / 6
      ];
      angle = angles[position % 6];
    } else {
      angle = (position / maxPlayers) * 2 * Math.PI - Math.PI / 2;
    }
    return angle;
  };

  // Rotation à appliquer pour que le viewer (currentPlayer) soit toujours en bas
  // (angle = Math.PI / 2). Si pas de currentPlayer, pas de rotation.
  const viewerRotation = currentPlayer && table
    ? Math.PI / 2 - getBaseAngle(currentPlayer.seatPosition, table.maxPlayers)
    : 0;

  // Calculate seat positions for oval table (avec rotation viewer-relative).
  // Le joueur courant (viewer) est toujours placé au sud (Math.PI / 2).
  const getSeatPosition = (position: number, _maxPlayers: number) => {
    const angle = getBaseAngle(position, _maxPlayers) + viewerRotation;

    // Radius ajusté pour positionner les seats au bord de la table
    const radiusX = seatPositioning.radius.radiusX; // Horizontal radius percentage (au bord de la table)
    const radiusY = seatPositioning.radius.radiusY; // Vertical radius percentage (au bord de la table)

    // Calculer la position avec contraintes pour éviter les débordements
    const rawX = 50 + radiusX * Math.cos(angle);
    const rawY = 50 + radiusY * Math.sin(angle);

    // Contraindre dans les limites visibles (seats au bord de la table)
    // Ajustement pour mobile pour éviter les empiètements  
    const { constraints } = seatPositioning;
    const x = Math.max(constraints.minX, Math.min(constraints.maxX, rawX)); // Seats au bord de la table
    const y = Math.max(constraints.minY, Math.min(constraints.maxY, rawY)); // Espace vertical ajusté

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
      angle,
    } as const;
  };

  // Calculate dealer button position (in front of player seat).
  // Utilise getBaseAngle + viewerRotation pour suivre la rotation du viewer.
  const getDealerButtonPosition = (position: number, maxPlayers: number) => {
    const angle = getBaseAngle(position, maxPlayers) + viewerRotation;

    // Utiliser les hooks pour le positionnement
    const { radiusX, radiusY } = seatPositioning.radius;
    const { minX, maxX, minY, maxY } = seatPositioning.constraints;

    const rawX = 50 + radiusX * Math.cos(angle);
    const rawY = 50 + radiusY * Math.sin(angle);

    // Contraindre dans les limites visibles
    const x = Math.max(minX, Math.min(maxX, rawX));
    const y = Math.max(minY, Math.min(maxY, rawY));

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
    };
  };

  // Create array of all seat positions
  const smallBlindPos = getSmallBlindPosition();
  const bigBlindPos = getBigBlindPosition();
  const seats = useMemo(() => {
    if (!table || !players || !gameState) return [];
    return Array.from({ length: table.maxPlayers }, (_, position) => {
      const player = players.find((p) => p.seatPosition === position && p.user);
      const isEmpty = !player;
      const seatGeom = getSeatPosition(position, table.maxPlayers);

      return {
        position,
        player,
        isEmpty,
        isDealer: gameState.dealerPosition === position,
        isCurrentPlayer: player?.userId === currentPlayer?.userId,
        isSmallBlind: smallBlindPos === position,
        isBigBlind: bigBlindPos === position,
        isActivePlayer: gameState.currentPlayerPosition === position,
        seatAngle: seatGeom.angle,
        seatGeom,
      } as const;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    table?.maxPlayers,
    players,
    gameState?.dealerPosition,
    gameState?.currentPlayerPosition,
    currentPlayer?.userId,
    smallBlindPos,
    bigBlindPos,
    viewerRotation,
    seatPositioning,
    isMobile,
  ]);

  // Early return if no tableId or no data (must be AFTER all hooks)
  if (isLoading || !table || !gameState || !players) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 p-4 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading table...</p>
        </div>
      </div>
    );
  }

  function getSmallBlindPosition() {
    if (!players || !gameState || !table) return -1;

    // Obtenir les positions réelles des joueurs actifs avec chips
    const playerPositions = players
      .filter(p => p.user && p.chips > 0) // Joueurs présents avec chips
      .map(p => p.seatPosition)
      .sort((a, b) => a - b);

    if (playerPositions.length < 2) return -1;

    if (playerPositions.length === 2) {
      // Heads-up: dealer est small blind
      return gameState.dealerPosition;
    } else {
      // Multi-way: small blind est le joueur actif suivant le dealer
      const dealerIndex = playerPositions.indexOf(gameState.dealerPosition);
      if (dealerIndex === -1) {
        // Dealer éliminé, utiliser la logique de rotation
        console.warn(`Dealer position ${gameState.dealerPosition} not found in active players`);
        return playerPositions[0]; // Fallback
      }
      const sbIndex = (dealerIndex + 1) % playerPositions.length;
      return playerPositions[sbIndex];
    }
  }

  function getBigBlindPosition() {
    if (!players || !gameState || !table) return -1;

    // Obtenir les positions réelles des joueurs actifs avec chips
    const playerPositions = players
      .filter(p => p.user && p.chips > 0) // Joueurs présents avec chips
      .map(p => p.seatPosition)
      .sort((a, b) => a - b);

    if (playerPositions.length < 2) return -1;

    if (playerPositions.length === 2) {
      // Heads-up: big blind est le non-dealer
      const dealerIndex = playerPositions.indexOf(gameState.dealerPosition);
      if (dealerIndex === -1) return playerPositions[0]; // Fallback
      const bbIndex = (dealerIndex + 1) % playerPositions.length;
      return playerPositions[bbIndex];
    } else {
      // Multi-way: big blind est 2 positions après le dealer
      const dealerIndex = playerPositions.indexOf(gameState.dealerPosition);
      if (dealerIndex === -1) {
        console.warn(`Dealer position ${gameState.dealerPosition} not found in active players`);
        return playerPositions[1]; // Fallback
      }
      const bbIndex = (dealerIndex + 2) % playerPositions.length;
      return playerPositions[bbIndex];
    }
  }

  // Mobile portrait heads-up : layout vertical simplifié
  if (isMobile && table.maxPlayers === 2 && isPortrait) {
    const opponent = players.find((p) => p.userId !== currentPlayer?.userId);
    // En heads-up : dealer = small blind, l'autre = big blind
    const dealerPos = gameState.dealerPosition;
    const sbPos = getSmallBlindPosition();
    const bbPos = getBigBlindPosition();
    const renderBadges = (seatPosition: number) => (
      <span className="inline-flex gap-1 ml-2">
        {seatPosition === dealerPos && (
          <span className="px-1.5 py-0.5 bg-yellow-500 text-black rounded-full text-[10px] font-bold" title="Dealer">D</span>
        )}
        {seatPosition === sbPos && (
          <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-[10px] font-bold" title="Small Blind">SB</span>
        )}
        {seatPosition === bbPos && (
          <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-[10px] font-bold" title="Big Blind">BB</span>
        )}
      </span>
    );
    const parseCardStr = (cardStr: string) => {
      if (!cardStr || cardStr.length < 2) return undefined;
      const rank = cardStr.slice(0, -1) as any;
      const suitChar = cardStr.slice(-1).toLowerCase();
      const suitMap: Record<string, any> = { h: "hearts", d: "diamonds", c: "clubs", s: "spades" };
      return { rank, suit: suitMap[suitChar] };
    };
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-poker-green-800 to-poker-green-900 text-white">
        {/* Header */}
        <header className="px-3 py-2 border-b border-poker-green-700 flex justify-between items-center flex-shrink-0 gap-2">
          <div className="text-sm min-w-0">
            <div className="font-bold truncate max-w-[140px]">{table.name}</div>
            <div className="text-xs text-poker-green-200">
              {table.smallBlind}/{table.bigBlind}
              {" • "}
              {table.gameType === "tournament" ? "Tournoi" : "Cash"}
            </div>
          </div>
          {table.inviteCode && (
            <button
              onClick={() => setShowInviteDialog(true)}
              title="Inviter des joueurs"
              className="px-2 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-xs font-mono tracking-widest"
            >
              📤 {table.inviteCode}
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={onLeaveTable}>
            Quitter
          </Button>
        </header>

        {/* Adversaire */}
        <section className="flex-1 flex flex-col items-center justify-start py-4 gap-2 min-h-0">
          {opponent ? (
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium flex items-center">
                <span>{opponent.user?.name ?? "Adversaire"}</span>
                {renderBadges(opponent.seatPosition)}
                {opponent.isFolded && (
                  <span className="ml-2 text-xs text-red-300">(couché)</span>
                )}
              </div>
              <div className="text-xs text-poker-green-200">
                {opponent.chips} jetons
                {opponent.currentBet > 0 && ` • mise ${opponent.currentBet}`}
              </div>
              <div className="flex gap-1 mt-2">
                <Card isHidden size="sm" />
                <Card isHidden size="sm" />
              </div>
            </div>
          ) : (
            <div className="text-poker-green-200 text-sm">
              En attente d'un joueur…
            </div>
          )}
        </section>

        {/* Centre: pot + community cards (affichées seulement après preflop) */}
        <section className="flex flex-col items-center justify-center py-3 gap-2 border-y border-poker-green-700/50 flex-shrink-0">
          <div className="text-xs text-poker-green-200 uppercase tracking-wider">
            {gameState.phase === "waiting" ? "En attente" : gameState.phase}
          </div>
          <div className="text-2xl font-bold">Pot {gameState.pot}</div>
          {gameState.communityCards.length > 0 && (
            <div className="flex gap-1 mt-1">
              {gameState.communityCards.map((cardStr: string, i: number) => (
                <Card key={i} card={parseCardStr(cardStr)} size="sm" />
              ))}
            </div>
          )}
        </section>

        {/* Joueur courant */}
        <section className="flex-1 flex flex-col items-center justify-end py-4 gap-2 min-h-0">
          {currentPlayer && (
            <>
              <div className="text-sm font-medium flex items-center">
                <span>{currentPlayer.user?.name ?? "Vous"}</span>
                {renderBadges(currentPlayer.seatPosition)}
                {currentPlayer.isFolded && (
                  <span className="ml-2 text-xs text-red-300">(couché)</span>
                )}
              </div>
              <div className="text-xs text-poker-green-200">
                {currentPlayer.chips} jetons
                {currentPlayer.currentBet > 0 &&
                  ` • mise ${currentPlayer.currentBet}`}
              </div>
              <div className="flex gap-1 mt-2">
                {(currentPlayer.cards ?? []).map((cardStr: string, i: number) => (
                  <Card key={i} card={parseCardStr(cardStr)} size="md" />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Actions en bas */}
        <footer className="border-t border-poker-green-700 p-3 flex-shrink-0">
          {gameState.phase === "waiting" &&
            players.length >= 2 &&
            currentPlayer &&
            currentPlayer.userId === table.creatorId && (
              <Button
                onClick={handleStartGame}
                variant="primary"
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Démarrage..." : "Démarrer la partie"}
              </Button>
            )}

          {currentPlayer &&
            isMyTurn &&
            gameState.phase !== "waiting" &&
            (availableActions?.length ?? 0) > 0 && (
              <BettingControls
                availableActions={(availableActions ?? []) as any}
                playerChips={currentPlayer.chips}
                currentBet={gameState.currentBet}
                potSize={gameState.pot}
                onAction={handlePlayerAction}
                disabled={isProcessing}
                potOdds={getPotOdds()?.ratio || undefined}
                handStrength={getHandStrength() || undefined}
              />
            )}

          {/* Bouton Recharger en mobile */}
          {table.gameType === "cash" &&
            currentPlayer &&
            currentPlayer.chips < table.bigBlind &&
            (gameState.phase === "waiting" ||
              gameState.phase === "showdown" ||
              currentPlayer.isFolded) && (
              <Button
                variant="primary"
                onClick={() => setShowRebuyDialog(true)}
                className="w-full mt-2"
              >
                Recharger
              </Button>
            )}
        </footer>

        {/* Showdown Results Modal */}
        {showdownResults && (
          <ShowdownResults
            results={showdownResults.results}
            pot={showdownResults.pot}
            communityCards={showdownResults.communityCards}
          />
        )}

        {/* Modale Rebuy */}
        {showRebuyDialog && currentPlayer && authUser && (
          <RebuyDialog
            isOpen={showRebuyDialog}
            onClose={() => setShowRebuyDialog(false)}
            startingStack={table.startingStack}
            currentChips={currentPlayer.chips}
            onConfirm={async (amount) => {
              await rebuyMutation({
                tableId: table._id,
                userId: authUser._id,
                amount,
              });
            }}
          />
        )}

        {/* Modale Invitation */}
        {showInviteDialog && table.inviteCode && (
          <InviteDialog
            isOpen={showInviteDialog}
            onClose={() => setShowInviteDialog(false)}
            inviteCode={table.inviteCode}
          />
        )}
      </div>
    );
  }

  return (
    <div className={responsiveClasses.pokerTableContainer}>

      {/* Landscape Warning for mobile portrait */}
      <LandscapeWarning />
      {/* Header - hidden on mobile */}
      {(!isMobile && !isIOS) && (
        <div className="flex justify-between items-center border-b border-poker-green-700 flex-shrink-0 p-4">
          <div className="text-white">
            <h1 className="text-2xl font-bold">{appTitle} - {table.name}</h1>
            <p className="text-sm text-poker-green-200">
              {table.gameType === "tournament" ? "Tournoi" : "Cash Game"} •
              Blinds: {table.smallBlind}/{table.bigBlind}
            </p>
            {table.inviteCode && (
              <button
                onClick={() => setShowInviteDialog(true)}
                title="Inviter des joueurs"
                className="mt-1 inline-flex items-center gap-1 px-3 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-sm font-mono tracking-widest text-white transition-colors"
              >
                📤 Inviter ({table.inviteCode})
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {/* Start game button in header - only for first game */}
            {gameState.phase === "waiting" &&
              table.status === "waiting" &&
              players.length >= 2 &&
              currentPlayer &&
              currentPlayer.userId === table.creatorId && (
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

            {table.gameType === "cash" &&
              currentPlayer &&
              currentPlayer.chips < table.bigBlind &&
              (gameState.phase === "waiting" ||
                gameState.phase === "showdown" ||
                currentPlayer.isFolded) && (
                <Button variant="primary" onClick={() => setShowRebuyDialog(true)}>
                  Recharger
                </Button>
              )}
          </div>
        </div>
      )}

      {/* Main content - responsive layout */}
      <div className={cn(
        "flex flex-1",
        isMobile ? "overflow-hidden" : "overflow-x-auto"
      )} style={!isMobile ? { minWidth: "1200px" } : {}}>

        {/* Left sidebar - Actions (desktop/tablet only) */}
        {(!isMobile && !isIOS) && (
          <div className={cn(
            responsiveClasses.sidebarWidth,
            "p-4 border-r"
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
          responsiveClasses.responsivePadding,
          isIOS && "safe-area"
        )} style={!isMobile ? { maxWidth: isTablet ? "calc(100% - 480px)" : "calc(100% - 640px)" } : {}}>

          {/* Main table area - fullscreen on mobile */}
          <div className={responsiveClasses.tableContainer}>
            {/* Mobile table container removed - was interfering with cards display */}
            {/* Table shadow */}
            <div className="absolute inset-1 bg-black/50 blur-2xl" style={{ borderRadius: '50%' }}></div>

            {/* Table felt - More oval shape with enhanced border */}
            <div className={responsiveClasses.pokerTableFelt}>
              {/* Table texture overlay */}
              <div className="absolute inset-3 bg-gradient-to-br from-white/5 via-transparent to-black/30 rounded-full"></div>

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
                className="absolute inset-4 border-2 rounded-full"
                style={{ borderColor: "rgba(245, 158, 11, 0.4)" }}
              ></div>
              <div
                className="absolute inset-6 border rounded-full"
                style={{ borderColor: "rgba(245, 158, 11, 0.25)" }}
              ></div>

              {/* Center area with community cards */}
              <div className={responsiveClasses.tableCenter}
                style={{
                  transform: isMobile ? 'translate(-50%, -50%) scaleY(1.43) scale(0.75)' : 'translate(-50%, -50%) scaleY(1.43)'
                }}>
                {/* Community cards */}
                <CommunityCards
                  cards={gameState.communityCards}
                  phase={gameState.phase}
                  pot={gameState.pot}
                  playersCount={players.length}
                  maxPlayers={table.maxPlayers}
                />
              </div>

              {/* Dealer button (pastille DEALER style PokerStars) */}
              {gameState.dealerPosition >= 0 && (
                <div
                  className={responsiveClasses.dealerButton}
                  style={{
                    ...getDealerButtonPosition(
                      gameState.dealerPosition,
                      table.maxPlayers
                    ),
                    transform: `${getDealerButtonPosition(gameState.dealerPosition, table.maxPlayers).transform} scaleY(1.43)`
                  }}
                >
                  DEALER
                </div>
              )}


              {/* Player seats around the table */}
              {seats.map((seat) => (
                <div
                  key={seat.position}
                  className={cn(
                    "absolute",
                    isMobile ? "z-mobile-controls" : "z-table-surface"
                  )}
                  style={{
                    left: seat.seatGeom.left,
                    top: seat.seatGeom.top,
                    transform: `${seat.seatGeom.transform} ${seatPositioning.seatTransform}`
                  }}
                >
                  <PlayerSeat
                    player={seat.player as any}
                    position={seat.position}
                    seatAngle={seat.seatAngle}
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
                <div
                  className="absolute top-4 left-4 bg-gradient-to-br from-white/95 to-gray-100/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/50"
                  style={{ transform: 'scaleY(1.43)' }}
                >
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


            </div>
          </div>

          {/* Betting controls below table (outside of table container) */}
          {/* Betting controls below table (outside of table container) */}
          {currentPlayer &&
            isMyTurn &&
            gameState.phase !== "waiting" &&
            availableActions.length > 0 && (
              <div className={cn(
                "w-full",
                isMobile ? "mt-0 max-w-none" : "mt-6 max-w-4xl"
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
            responsiveClasses.sidebarWidth,
            "p-4 border-l"
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

        {/* Mobile left sidebar - fixed navigation */}
        {isMobile && (
          <div className={cn(
            "fixed left-0 top-1/2 transform -translate-y-1/2 z-40 bg-poker-green-800/95 backdrop-blur-sm border-r border-poker-green-600 rounded-r-lg transition-transform duration-300",
            showMobileSidebar ? "translate-x-0" : "-translate-x-full",
            isIOS && "safe-area"
          )}>
            <div className="flex flex-col items-center justify-around py-4 px-2">
              {/* Toggle button */}
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-poker-green-800/95 backdrop-blur-sm border border-poker-green-600 rounded-full flex items-center justify-center transition-colors hover:bg-poker-green-700/95"
              >
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
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
              {gameState.phase === "waiting" && table.status === "waiting" && players.length >= 2 && currentPlayer && currentPlayer.userId === table.creatorId ? (
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

        {/* Mobile sidebar toggle button - only visible when sidebar is hidden */}
        {isMobile && !showMobileSidebar && (
          <button
            onClick={() => setShowMobileSidebar(true)}
            className={cn(
              "fixed left-0 top-1/2 transform -translate-y-1/2 z-50 bg-poker-green-800/95 backdrop-blur-sm border-r border-poker-green-600 rounded-r-lg p-2 transition-all duration-300",
              isIOS && "safe-area"
            )}
          >
            <svg
              className="w-5 h-5 text-white transition-transform duration-300 rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
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

        {/* Rebuy Dialog */}
        {showRebuyDialog && currentPlayer && authUser && (
          <RebuyDialog
            isOpen={showRebuyDialog}
            onClose={() => setShowRebuyDialog(false)}
            startingStack={table.startingStack}
            currentChips={currentPlayer.chips}
            onConfirm={async (amount) => {
              await rebuyMutation({
                tableId: table._id,
                userId: authUser._id,
                amount,
              });
            }}
          />
        )}

        {/* Invite Dialog */}
        {showInviteDialog && table.inviteCode && (
          <InviteDialog
            isOpen={showInviteDialog}
            onClose={() => setShowInviteDialog(false)}
            inviteCode={table.inviteCode}
          />
        )}
      </div>
    </div>
  );
};
