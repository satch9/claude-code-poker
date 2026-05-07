import React, { useState, useEffect, useMemo } from "react";
import { PlayerSeat } from "./PlayerSeat";
import { CommunityCards } from "./CommunityCards";
import { Card } from "../UI/Card";
import { BettingControls } from "./BettingControls";
import { ShowdownResults } from "./ShowdownResults";
import { HeaderActionIcons } from "./HeaderActionIcons";
import { ActionFeedDrawer } from "./ActionFeedDrawer";
import { ChatDrawer } from "./ChatDrawer";
import { SettingsDrawer } from "./SettingsDrawer";
import { TournamentInfo } from "./TournamentInfo";
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

// ============================================================================
// Helpers stables (module-scope) — déplacés hors du composant pour stabilité
// des références dans useMemo. Toutes les dépendances sont passées en args.
// ============================================================================

// Calculate the BASE angle for a seat position (before viewer rotation)
function computeBaseAngle(position: number, maxPlayers: number, isMobile: boolean): number {
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
}

interface SeatGeomDeps {
  radius: { radiusX: number; radiusY: number };
  constraints: { minX: number; maxX: number; minY: number; maxY: number };
}

// Calculate seat positions for oval table (avec rotation viewer-relative).
function computeSeatPosition(
  position: number,
  maxPlayers: number,
  viewerRotation: number,
  isMobile: boolean,
  seatPositioning: SeatGeomDeps
) {
  const angle = computeBaseAngle(position, maxPlayers, isMobile) + viewerRotation;

  const radiusX = seatPositioning.radius.radiusX;
  const radiusY = seatPositioning.radius.radiusY;

  const rawX = 50 + radiusX * Math.cos(angle);
  const rawY = 50 + radiusY * Math.sin(angle);

  const { constraints } = seatPositioning;
  const x = Math.max(constraints.minX, Math.min(constraints.maxX, rawX));
  const y = Math.max(constraints.minY, Math.min(constraints.maxY, rawY));

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    angle,
  } as const;
}

// Calculate dealer button position (in front of player seat).
function computeDealerButtonPosition(
  position: number,
  maxPlayers: number,
  viewerRotation: number,
  isMobile: boolean,
  seatPositioning: SeatGeomDeps
) {
  const angle = computeBaseAngle(position, maxPlayers, isMobile) + viewerRotation;

  const { radiusX, radiusY } = seatPositioning.radius;
  const { minX, maxX, minY, maxY } = seatPositioning.constraints;

  const rawX = 50 + radiusX * Math.cos(angle);
  const rawY = 50 + radiusY * Math.sin(angle);

  const x = Math.max(minX, Math.min(maxX, rawX));
  const y = Math.max(minY, Math.min(maxY, rawY));

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
  };
}

interface BlindPlayerLike {
  user?: unknown;
  chips: number;
  seatPosition: number;
}

function computeSmallBlindPosition(
  players: BlindPlayerLike[] | null | undefined,
  dealerPosition: number | undefined
): number {
  if (!players || dealerPosition === undefined) return -1;

  const playerPositions = players
    .filter(p => p.user && p.chips > 0)
    .map(p => p.seatPosition)
    .sort((a, b) => a - b);

  if (playerPositions.length < 2) return -1;

  if (playerPositions.length === 2) {
    return dealerPosition;
  } else {
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    if (dealerIndex === -1) {
      console.warn(`Dealer position ${dealerPosition} not found in active players`);
      return playerPositions[0];
    }
    const sbIndex = (dealerIndex + 1) % playerPositions.length;
    return playerPositions[sbIndex];
  }
}

function computeBigBlindPosition(
  players: BlindPlayerLike[] | null | undefined,
  dealerPosition: number | undefined
): number {
  if (!players || dealerPosition === undefined) return -1;

  const playerPositions = players
    .filter(p => p.user && p.chips > 0)
    .map(p => p.seatPosition)
    .sort((a, b) => a - b);

  if (playerPositions.length < 2) return -1;

  if (playerPositions.length === 2) {
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    if (dealerIndex === -1) return playerPositions[0];
    const bbIndex = (dealerIndex + 1) % playerPositions.length;
    return playerPositions[bbIndex];
  } else {
    const dealerIndex = playerPositions.indexOf(dealerPosition);
    if (dealerIndex === -1) {
      console.warn(`Dealer position ${dealerPosition} not found in active players`);
      return playerPositions[1];
    }
    const bbIndex = (dealerIndex + 2) % playerPositions.length;
    return playerPositions[bbIndex];
  }
}

export const PokerTable: React.FC<PokerTableProps> = ({
  tableId,
  appTitle,
  onLeaveTable,
  onJoinSeat,
}) => {
  const [showGameInfo, setShowGameInfo] = useState(false);
  // (showMobileMenu / showMobileSidebar retirés — remplacés par le top
  // header mobile + drawers communs au desktop)
  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showActionsDrawer, setShowActionsDrawer] = useState(false);
  const rebuyMutation = useMutation(api.players.rebuy);
  const joinTableMutation = useMutation(api.players.joinTable);
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
  const { isMobile, isIOS } = useBreakpoint();
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
    handleTimeOut,
    showdownResults,
  } = useGameLogic(tableId, onLeaveTable);

  const isLoading = !tableId || !gameState || !players || !table;

  // Auto-réactivation : si l'utilisateur courant est en sit-out à la table,
  // on appelle joinTable pour reset le flag (il vient de revenir).
  useEffect(() => {
    if (!authUser || !tableId || !currentPlayer) return;
    if (!(currentPlayer as any).sitOut) return;
    joinTableMutation({
      tableId: tableId as Id<"tables">,
      userId: authUser._id,
    }).catch((err) => {
      console.warn("Auto-rejoin (sit-out reactivation) failed:", err);
    });
  }, [authUser?._id, tableId, currentPlayer, joinTableMutation]);

  // Get game info
  const potOdds = getPotOdds();
  const handStrength = getHandStrength();
  void getGameStats; // hook conservé pour usage futur
  const currentBet = gameState?.currentBet || 0;

  // Rotation à appliquer pour que le viewer (currentPlayer) soit toujours en bas
  // (angle = Math.PI / 2). Si pas de currentPlayer, pas de rotation.
  const viewerRotation = currentPlayer && table
    ? Math.PI / 2 - computeBaseAngle(currentPlayer.seatPosition, table.maxPlayers, isMobile)
    : 0;

  // Create array of all seat positions
  const smallBlindPos = computeSmallBlindPosition(players, gameState?.dealerPosition);
  const bigBlindPos = computeBigBlindPosition(players, gameState?.dealerPosition);
  const seats = useMemo(() => {
    if (!table || !players || !gameState) return [];
    return Array.from({ length: table.maxPlayers }, (_, position) => {
      const player = players.find((p) => p.seatPosition === position && p.user);
      const isEmpty = !player;
      const seatGeom = computeSeatPosition(
        position,
        table.maxPlayers,
        viewerRotation,
        isMobile,
        seatPositioning
      );

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
  }, [
    table,
    players,
    gameState,
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

  // Mobile portrait heads-up : layout vertical simplifié
  if (isMobile && table.maxPlayers === 2 && isPortrait) {
    const opponent = players.find((p) => p.userId !== currentPlayer?.userId);
    // En heads-up : dealer = small blind, l'autre = big blind
    const dealerPos = gameState.dealerPosition;
    const sbPos = smallBlindPos;
    const bbPos = bigBlindPos;
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
        <header className="px-2 py-2 border-b border-poker-green-700 flex justify-between items-center flex-shrink-0 gap-1">
          <div className="text-sm min-w-0 flex-1">
            <div className="font-bold truncate">{table.name}</div>
            <div className="text-xs text-poker-green-200 truncate">
              {table.smallBlind}/{table.bigBlind}
              {" • "}
              {table.gameType === "tournament" ? "Tournoi" : "Cash"}
            </div>
          </div>
          {table.inviteCode && authUser?._id === table.creatorId && (
            <button
              onClick={() => setShowInviteDialog(true)}
              title={`Code d'invitation : ${table.inviteCode}`}
              className="px-2 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded text-base flex-shrink-0"
              aria-label="Inviter des joueurs"
            >
              📤
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={onLeaveTable} className="flex-shrink-0">
            Quitter
          </Button>
        </header>

        {/* Tournament info bar */}
        {table.gameType === "tournament" && table.modules?.tournament && (
          <div className="px-3 pt-2">
            <TournamentInfo
              blindStructure={table.modules.tournament.blindStructure}
              currentBlindLevel={table.modules.tournament.currentBlindLevel ?? 0}
              nextBlindIncrease={table.modules.tournament.nextBlindIncrease}
              prizeStructure={table.modules.tournament.prizeStructure}
              status={table.modules.tournament.status ?? "registering"}
              totalPlayers={table.maxPlayers}
              remainingPlayers={(players ?? []).filter((p: any) => p.chips > 0 && !p.eliminatedAt).length}
              buyIn={table.buyIn}
            />
          </div>
        )}

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

        {/* Tournament terminé : prioritaire sur le showdown de la dernière main
            (le scoreboard final + bouton 'Retour au lobby' doit rester visible
            même si gameState.phase est encore 'showdown'). */}
        {table.gameType === "tournament" &&
        table.modules?.tournament?.status === "finished" ? (
          <ShowdownResults
            results={[]}
            pot={0}
            communityCards={[]}
            table={table}
            players={players}
            onBackToLobby={onLeaveTable}
          />
        ) : showdownResults ? (
          <ShowdownResults
            results={showdownResults.results}
            pot={showdownResults.pot}
            communityCards={showdownResults.communityCards}
            table={table}
            players={players}
          />
        ) : null}

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
      {/* Header mobile (non heads-up portrait) — version compacte du header
          desktop, avec la même rangée d'icônes dans le drawer system. */}
      {isMobile && !isIOS && (
        <div className="flex justify-between items-center border-b border-poker-green-700 flex-shrink-0 px-2 py-2 gap-1">
          <div className="text-white min-w-0 flex-1">
            <div className="text-sm font-bold truncate">{table.name}</div>
            <div className="text-xs text-poker-green-200 truncate">
              {table.gameType === "tournament" ? "Tournoi" : "Cash"} •
              {" "}{table.smallBlind}/{table.bigBlind}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {gameState.phase === "waiting" &&
              table.status === "waiting" &&
              players.length >= 2 &&
              currentPlayer &&
              currentPlayer.userId === table.creatorId && (
                <Button
                  onClick={handleStartGame}
                  disabled={isProcessing}
                  size="sm"
                  variant="primary"
                >
                  {isProcessing ? "..." : "Démarrer"}
                </Button>
              )}
            <HeaderActionIcons
              onToggleChat={() => setShowChatDrawer((v) => !v)}
              onToggleSettings={() => setShowSettingsDrawer((v) => !v)}
              onToggleGameInfo={() => setShowGameInfo((v) => !v)}
              onToggleInvite={() => setShowInviteDialog((v) => !v)}
              onToggleActions={() => setShowActionsDrawer((v) => !v)}
              showInvite={!!table.inviteCode && authUser?._id === table.creatorId}
            />
            <Button variant="secondary" size="sm" onClick={onLeaveTable}>
              Quitter
            </Button>
          </div>
        </div>
      )}

      {/* Header desktop */}
      {(!isMobile && !isIOS) && (
        <div className="flex justify-between items-center border-b border-poker-green-700 flex-shrink-0 px-3 lg:px-4 py-3 lg:py-4 gap-2">
          <div className="text-white min-w-0 flex-1">
            <h1 className="text-base md:text-xl lg:text-2xl font-bold truncate">
              <span className="hidden lg:inline">{appTitle} - </span>
              {table.name}
            </h1>
            <p className="text-xs lg:text-sm text-poker-green-200 truncate">
              {table.gameType === "tournament" ? "Tournoi" : "Cash Game"} •
              Blinds: {table.smallBlind}/{table.bigBlind}
            </p>
          </div>
          <div className="flex gap-1 lg:gap-2 items-center flex-shrink-0">
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

            <HeaderActionIcons
              onToggleChat={() => setShowChatDrawer((v) => !v)}
              onToggleSettings={() => setShowSettingsDrawer((v) => !v)}
              onToggleGameInfo={() => setShowGameInfo((v) => !v)}
              onToggleInvite={() => setShowInviteDialog((v) => !v)}
              onToggleActions={() => setShowActionsDrawer((v) => !v)}
              showInvite={
                !!table.inviteCode && authUser?._id === table.creatorId
              }
            />

            <Button variant="secondary" onClick={onLeaveTable}>
              Quitter
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

      {/* Tournament info bar */}
      {table.gameType === "tournament" && table.modules?.tournament && (
        <div className="px-4 pt-2">
          <TournamentInfo
            blindStructure={table.modules.tournament.blindStructure}
            currentBlindLevel={table.modules.tournament.currentBlindLevel ?? 0}
            nextBlindIncrease={table.modules.tournament.nextBlindIncrease}
            prizeStructure={table.modules.tournament.prizeStructure}
            status={table.modules.tournament.status ?? "registering"}
            totalPlayers={table.maxPlayers}
            remainingPlayers={(players ?? []).filter((p: any) => p.chips > 0 && !p.eliminatedAt).length}
            buyIn={table.buyIn}
          />
        </div>
      )}

      {/* Main content - responsive layout */}
      <div className={cn(
        "flex flex-1",
        isMobile ? "overflow-hidden" : "overflow-x-auto"
      )}>

        {/* Center - Table (full width après refactor)
            justify-center : centre verticalement la table quand sa
            hauteur est inférieure au parent (cas desktop h-[700px]
            dans un viewport plus grand). Sinon le 700px était collé
            en haut avec un vide visible en dessous. */}
        <div className={cn(
          "flex-1 flex flex-col items-center justify-center",
          responsiveClasses.responsivePadding,
          isIOS && "safe-area"
        )}>

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
                    ...computeDealerButtonPosition(
                      gameState.dealerPosition,
                      table.maxPlayers,
                      viewerRotation,
                      isMobile,
                      seatPositioning
                    ),
                    transform: `${computeDealerButtonPosition(gameState.dealerPosition, table.maxPlayers, viewerRotation, isMobile, seatPositioning).transform} scaleY(1.43)`
                  }}
                >
                  DEALER
                </div>
              )}


              {/* Player seats around the table.
                  En tournoi running, on n'affiche pas les sièges vides
                  (= joueurs éliminés) pour ne pas polluer la vue. */}
              {seats
                .filter((seat) => {
                  if (!seat.isEmpty) return true;
                  const tournamentRunning =
                    table.gameType === "tournament" &&
                    table.modules?.tournament?.status === "running";
                  return !tournamentRunning;
                })
                .map((seat) => (
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
                    onSeatClick={() => {
                      if (!seat.isEmpty) return;
                      // Tournoi running : on n'accepte plus de nouveaux joueurs
                      // (pas de rebuy). Les sièges vides correspondent à des éliminés.
                      const tournamentRunning =
                        table.gameType === "tournament" &&
                        table.modules?.tournament?.status === "running";
                      if (tournamentRunning) return;
                      onJoinSeat(seat.position);
                    }}
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

        {/* Right sidebar desktop supprimée — Chat / Paramètres / Actions rapides
            sont désormais accessibles via les icônes du header (drawers). */}

        {/* Mobile : la navbar verticale et le menu modal ont été retirés.
            Le top header mobile (plus haut) + les drawers (Chat/Paramètres/
            Actions/Infos) couvrent désormais ces fonctions. */}

        {/* Tournament terminé : prioritaire sur le showdown de la dernière main
            (le scoreboard final + bouton 'Retour au lobby' doit rester visible
            même si gameState.phase est encore 'showdown'). */}
        {table.gameType === "tournament" &&
        table.modules?.tournament?.status === "finished" ? (
          <ShowdownResults
            results={[]}
            pot={0}
            communityCards={[]}
            table={table}
            players={players}
            onBackToLobby={onLeaveTable}
          />
        ) : showdownResults ? (
          <ShowdownResults
            results={showdownResults.results}
            pot={showdownResults.pot}
            communityCards={showdownResults.communityCards}
            table={table}
            players={players}
          />
        ) : null}

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

        {/* Drawers déclenchés par les icônes du header */}
        <ActionFeedDrawer
          isOpen={showActionsDrawer}
          onClose={() => setShowActionsDrawer(false)}
          actions={actionHistory}
        />
        <ChatDrawer
          isOpen={showChatDrawer}
          onClose={() => setShowChatDrawer(false)}
        />
        <SettingsDrawer
          isOpen={showSettingsDrawer}
          onClose={() => setShowSettingsDrawer(false)}
        />
      </div>
    </div>
  );
};
