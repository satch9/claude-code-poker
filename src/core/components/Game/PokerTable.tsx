import React, { useState, useEffect, useMemo } from "react";
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { PlayerSeat } from "./PlayerSeat";
import { CommunityCards } from "./CommunityCards";
import { Card } from "../UI/Card";
import { BettingControls } from "./BettingControls";
import { TournamentScoreboard } from "./TournamentScoreboard";
import { PotFlyToWinner } from "./PotFlyToWinner";
import { HeaderActionIcons } from "./HeaderActionIcons";
import { Drawer } from "../UI/Drawer";
import { SettingsDrawer } from "./SettingsDrawer";
import { TournamentInfo } from "./TournamentInfo";
import { Button } from "../UI/Button";
import { LandscapeWarning } from "../UI/LandscapeWarning";
import { cn } from "@/shared/utils/cn";
import { useGameLogic } from "../../hooks/useGameLogic";
import { useTableChat } from "../../hooks/useTableChat";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useResponsiveClasses, useSeatPositioning } from "../../hooks/useResponsiveClasses";
import { Id } from "../../../../convex/_generated/dataModel";
import { calculateSidePots } from "../../../../convex/utils/turnManager";
import { RebuyDialog } from "./RebuyDialog";
import { InviteDialog } from "./InviteDialog";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../hooks/useAuth";
import { useOrientation } from "@/shared/hooks/useOrientation";
import { TableRightPanel } from './TableRightPanel';
import { PlayersChipsBar } from './PlayersChipsBar';

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
  // (showMobileMenu / showMobileSidebar retirés — remplacés par le top
  // header mobile + drawers communs au desktop)
  // (showGameInfo retiré : les infos partie — joueurs, phase, mise, blinds,
  // type, pot — sont déjà visibles directement à l'écran de jeu.)
  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  // Drawer unifié contenant 3 onglets : Joueurs / Historique / Chat.
  // Remplace les anciens drawers ChatDrawer + ActionFeedDrawer.
  const [showTablePanelDrawer, setShowTablePanelDrawer] = useState(false);
  // Mobile uniquement : header masqué par défaut, révélé en overlay via chevron.
  const [showHeaderDrawer, setShowHeaderDrawer] = useState(false);
  useEffect(() => {
    if (!showHeaderDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHeaderDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHeaderDrawer]);
  const rebuyMutation = useMutation(api.players.rebuy);
  const joinTableMutation = useMutation(api.players.joinTable);
  const { user: authUser } = useAuth();
  const { unreadCount: unreadChatCount } = useTableChat(tableId);
  const headerUnreadChat = showTablePanelDrawer ? 0 : unreadChatCount;

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
  const orientation = useOrientation();
  const isLandscape = orientation === "landscape";
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

  // Résumé des joueurs pour le panneau latéral desktop
  const playersForPanel = (players ?? []).map((p) => ({
    userId: String(p.userId),
    name: (p as any).user?.name || 'Joueur',
    chips: p.chips ?? 0,
    isFolded: !!p.isFolded,
    isAllIn: !!p.isAllIn,
    isCurrent: p.userId === currentPlayer?.userId,
  }));

  // Version pour la PlayersChipsBar : on inclut les éliminés (line-through)
  // et on trie par seatPosition pour un ordre stable.
  const playersForChipsBar = (players ?? [])
    .slice()
    .sort((a, b) => a.seatPosition - b.seatPosition)
    .map((p) => ({
      userId: String(p.userId),
      name: (p as any).user?.name || 'Joueur',
      chips: p.chips ?? 0,
      isFolded: !!p.isFolded,
      isAllIn: !!p.isAllIn,
      eliminated: !!(p as any).eliminatedAt,
      isCurrent: p.userId === currentPlayer?.userId,
    }));

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

  // ----- Side pots stratifiés calculés côté client -----
  // gameState.sidePots n'est jamais alimenté par le moteur ; on reconstruit
  // la stratification à partir des contributions cumulées des joueurs
  // (handContribution rempli par le moteur, reset entre les mains).
  const liveSidePots = useMemo(() => {
    if (!players || players.length === 0) return [] as { amount: number }[];
    const pots = calculateSidePots(
      players.map((p) => ({
        userId: String(p.userId),
        contribution: p.handContribution ?? p.currentBet ?? 0,
        isFolded: p.isFolded,
      })),
    );
    return pots.map((p) => ({ amount: p.amount }));
  }, [players]);

  // ----- Showdown : cartes révélées + gagnants + orchestration -----
  // showdownResults vient de useGameLogic (query getShowdownResults active
  // uniquement quand gameState.phase === 'showdown').
  const showdownCardsByUserId = useMemo(() => {
    const m = new Map<string, string[]>();
    if (showdownResults?.results) {
      for (const r of showdownResults.results) {
        m.set(String(r.userId), r.cards);
      }
    }
    return m;
  }, [showdownResults]);

  const showdownWinners = useMemo(() => {
    const s = new Set<string>();
    if (showdownResults?.pots) {
      for (const p of showdownResults.pots) {
        for (const id of p.winnerUserIds) s.add(String(id));
      }
    }
    return s;
  }, [showdownResults]);

  // Index du side pot en cours d'animation (null = aucune anim active).
  const [showdownPotIndex, setShowdownPotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (gameState?.phase !== "showdown") {
      setShowdownPotIndex(null);
      return;
    }
    const pots = showdownResults?.pots;
    if (!pots || pots.length === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let i = 0;

    const step = () => {
      if (cancelled) return;
      if (i >= pots.length) {
        setShowdownPotIndex(null);
        return;
      }
      setShowdownPotIndex(i);
      i += 1;
      // 900ms d'animation + 600ms de pause avant le prochain pot.
      timer = setTimeout(step, 1500);
    };

    // Délai initial pour laisser le card-reveal se jouer (~800ms).
    timer = setTimeout(step, 800);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [gameState?.phase, showdownResults]);

  const currentShowdownPot = useMemo(() => {
    if (showdownPotIndex === null) return null;
    const pots = showdownResults?.pots;
    if (!pots || showdownPotIndex >= pots.length) return null;
    const pot = pots[showdownPotIndex];
    if (pot.winnerUserIds.length === 0) return null;
    // Choisit le premier gagnant comme cible visuelle de l'animation.
    // En cas de split pot (rare), on anime vers le 1er ; les gagnants
    // multiples sont déjà tous mis en avant via le winner-glow.
    const winnerUserId = String(pot.winnerUserIds[0]);
    const winnerSeat = seats.find(
      (s) => s.player?.userId && String(s.player.userId) === winnerUserId,
    );
    if (!winnerSeat) return null;
    return {
      amount: pot.amount,
      seatAngle: winnerSeat.seatAngle,
    };
  }, [showdownPotIndex, showdownResults, seats]);

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
        {/* Header heads-up portrait — masqué par défaut, révélé via chevron flottant. */}
        {!showHeaderDrawer && (
          <button
            onClick={() => setShowHeaderDrawer(true)}
            aria-label="Afficher le header"
            className="fixed top-8 left-1/2 -translate-x-1/2 z-30 bg-poker-green-700/80 hover:bg-poker-green-600 rounded-full px-3 py-0.5 text-white shadow"
          >
            <ChevronDown size={18} />
          </button>
        )}
        {showHeaderDrawer && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowHeaderDrawer(false)}
              aria-hidden
            />
            <header className="fixed top-0 left-0 right-0 z-50 bg-poker-green-800 border-b border-poker-green-700 shadow-lg px-2 py-2 flex justify-between items-center gap-1 transition-transform duration-200">
              <div className="text-sm min-w-0 flex-1">
                <div className="font-bold truncate">{table.name}</div>
                {table.gameType === "tournament" && table.modules?.tournament ? (
                  <TournamentInfo
                    compact
                    blindStructure={table.modules.tournament.blindStructure}
                    currentBlindLevel={table.modules.tournament.currentBlindLevel ?? 0}
                    nextBlindIncrease={table.modules.tournament.nextBlindIncrease}
                    prizeStructure={table.modules.tournament.prizeStructure}
                    status={table.modules.tournament.status ?? "registering"}
                    totalPlayers={table.maxPlayers}
                    remainingPlayers={(players ?? []).filter((p: any) => p.chips > 0 && !p.eliminatedAt).length}
                    buyIn={table.buyIn}
                  />
                ) : (
                  <div className="text-xs text-poker-green-200 truncate">
                    Cash · {table.smallBlind}/{table.bigBlind}
                  </div>
                )}
              </div>
              {table.inviteCode && authUser?._id === table.creatorId && (
                <button
                  onClick={() => { setShowHeaderDrawer(false); setShowInviteDialog(true); }}
                  title={`Code d'invitation : ${table.inviteCode}`}
                  className="px-2 py-1 bg-poker-green-700 hover:bg-poker-green-600 rounded flex-shrink-0 inline-flex items-center justify-center"
                  aria-label="Inviter des joueurs"
                >
                  <Send size={16} aria-hidden />
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={() => { setShowHeaderDrawer(false); onLeaveTable(); }} className="flex-shrink-0">
                Quitter
              </Button>
              <button
                onClick={() => setShowHeaderDrawer(false)}
                aria-label="Masquer le header"
                className="p-1 rounded text-white hover:bg-poker-green-700 flex-shrink-0"
              >
                <ChevronUp size={18} />
              </button>
            </header>
          </>
        )}

        {/* Tournament info — désormais intégré dans le header (compact). */}

        {/* Bandeau récap chips de tous les joueurs */}
        <PlayersChipsBar players={playersForChipsBar} />

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
          {liveSidePots.length >= 2 ? (
            <div className="flex flex-col items-center gap-0.5 text-sm font-semibold">
              {liveSidePots.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-poker-green-200">
                    {i === 0 ? "Pot principal" : `Side pot ${i}`}
                  </span>
                  <span className="text-gold tabular-nums">{p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-2xl font-bold">Pot {gameState.pot}</div>
          )}
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

        {/* Tournament terminé : scoreboard final + bouton 'Retour au lobby'.
            Le showdown de main est géré sur le tapis lui-même (cartes
            retournées + winner-glow + animation PotFlyToWinner) et n'a plus
            de modale. */}
        {table.gameType === "tournament" &&
          table.modules?.tournament?.status === "finished" && (
            <TournamentScoreboard
              table={table}
              players={players}
              onBackToLobby={onLeaveTable}
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
      {/* Header mobile (non heads-up portrait) — masqué par défaut,
          révélé en overlay via le chevron flottant. */}
      {isMobile && !showHeaderDrawer && (
        <button
          onClick={() => setShowHeaderDrawer(true)}
          aria-label="Afficher le header"
          className="fixed top-8 left-1/2 -translate-x-1/2 z-30 bg-poker-green-700/80 hover:bg-poker-green-600 rounded-full px-3 py-0.5 text-white shadow"
        >
          <ChevronDown size={18} />
        </button>
      )}
      {isMobile && showHeaderDrawer && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowHeaderDrawer(false)}
            aria-hidden
          />
          <div className="fixed top-0 left-0 right-0 z-50 bg-poker-green-800 border-b border-poker-green-700 shadow-lg flex justify-between items-center px-2 py-2 gap-1 transition-transform duration-200">
            <div className="text-white min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{table.name}</div>
              {table.gameType === "tournament" && table.modules?.tournament ? (
                <TournamentInfo
                  compact
                  blindStructure={table.modules.tournament.blindStructure}
                  currentBlindLevel={table.modules.tournament.currentBlindLevel ?? 0}
                  nextBlindIncrease={table.modules.tournament.nextBlindIncrease}
                  prizeStructure={table.modules.tournament.prizeStructure}
                  status={table.modules.tournament.status ?? "registering"}
                  totalPlayers={table.maxPlayers}
                  remainingPlayers={(players ?? []).filter((p: any) => p.chips > 0 && !p.eliminatedAt).length}
                  buyIn={table.buyIn}
                />
              ) : (
                <div className="text-xs text-poker-green-200 truncate">
                  Cash · {table.smallBlind}/{table.bigBlind}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {gameState.phase === "waiting" &&
                table.status === "waiting" &&
                players.length >= 2 &&
                currentPlayer &&
                currentPlayer.userId === table.creatorId && (
                  <Button
                    onClick={() => { setShowHeaderDrawer(false); handleStartGame(); }}
                    disabled={isProcessing}
                    size="sm"
                    variant="primary"
                  >
                    {isProcessing ? "..." : "Démarrer"}
                  </Button>
                )}
              <HeaderActionIcons
                onTogglePanel={() => { setShowTablePanelDrawer((v) => !v); setShowHeaderDrawer(false); }}
                onToggleSettings={() => { setShowSettingsDrawer((v) => !v); setShowHeaderDrawer(false); }}
                onToggleInvite={() => { setShowInviteDialog((v) => !v); setShowHeaderDrawer(false); }}
                showInvite={!!table.inviteCode && authUser?._id === table.creatorId}
                unreadChat={headerUnreadChat}
              />
              <Button variant="secondary" size="sm" onClick={() => { setShowHeaderDrawer(false); onLeaveTable(); }}>
                Quitter
              </Button>
              <button
                onClick={() => setShowHeaderDrawer(false)}
                aria-label="Masquer le header"
                className="ml-1 p-1 rounded text-white hover:bg-poker-green-700"
              >
                <ChevronUp size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header desktop */}
      {!isMobile && (
        <div className="flex justify-between items-center border-b border-poker-green-700 flex-shrink-0 px-3 lg:px-4 py-3 lg:py-4 gap-2">
          <div className="text-white min-w-0 flex-1">
            <h1 className="text-base md:text-xl lg:text-2xl font-bold truncate">
              <span className="hidden lg:inline">{appTitle} - </span>
              {table.name}
            </h1>
            {table.gameType === "tournament" && table.modules?.tournament ? (
              <div className="text-xs lg:text-sm">
                <TournamentInfo
                  compact
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
            ) : (
              <p className="text-xs lg:text-sm text-poker-green-200 truncate">
                Cash Game · Blinds {table.smallBlind}/{table.bigBlind}
              </p>
            )}
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
              onTogglePanel={() => setShowTablePanelDrawer((v) => !v)}
              onToggleSettings={() => setShowSettingsDrawer((v) => !v)}
              onToggleInvite={() => setShowInviteDialog((v) => !v)}
              showInvite={
                !!table.inviteCode && authUser?._id === table.creatorId
              }
              unreadChat={headerUnreadChat}
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

      {/* Tournament info — désormais intégré dans le header (compact). */}

      {/* Bandeau récap chips de tous les joueurs */}
      <PlayersChipsBar players={playersForChipsBar} />

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

              {/* Center area with community cards.
                  scaleY(1.43) compense le scaleY(0.7) du feutre.
                  On retire le scale(0.75) mobile qui rapetissait inutilement
                  les cartes communes (déjà petites en xs). Maintenant que les
                  sièges N/S sont poussés vers l'extérieur, on a la place. */}
              <div className={responsiveClasses.tableCenter}
                style={{
                  transform: `translate(-50%, -50%) scaleY(${isMobile ? 1.176 : 1.43})`
                }}>
                {/* Community cards */}
                <CommunityCards
                  cards={gameState.communityCards}
                  phase={gameState.phase}
                  pot={gameState.pot}
                  playersCount={players.length}
                  maxPlayers={table.maxPlayers}
                  sidePots={liveSidePots}
                />
              </div>

              {/* Pastille DEALER désormais affichée comme badge sur le seat
                  (cf. PlayerSeat → BlindBadge type="dealer"), plus visible
                  qu'un bouton flottant qui passait derrière les joueurs. */}

              {/* Player seats around the table.
                  En tournoi running, on n'affiche pas les sièges vides
                  (= joueurs éliminés) pour ne pas polluer la vue. */}
              {seats
                .filter((seat) => {
                  if (!seat.isEmpty) return true;
                  const tournamentRunning =
                    table.gameType === "tournament" &&
                    table.modules?.tournament?.status === "running";
                  // En tournoi running on cache les sièges vides (joueurs
                  // éliminés), SAUF s'ils portent le bouton dealer fantôme :
                  // la pastille D doit rester visible sur le tapis.
                  if (tournamentRunning) return seat.isDealer;
                  return true;
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
                    revealedCards={
                      gameState.phase === "showdown" && seat.player?.userId
                        ? showdownCardsByUserId.get(String(seat.player.userId))
                        : undefined
                    }
                    isShowdownWinner={
                      gameState.phase === "showdown" &&
                      !!seat.player?.userId &&
                      showdownWinners.has(String(seat.player.userId))
                    }
                    isEmpty={seat.isEmpty}
                    onSeatClick={(() => {
                      const tournamentRunning =
                        table.gameType === "tournament" &&
                        table.modules?.tournament?.status === "running";
                      // Tournoi running : sièges vides = joueurs éliminés,
                      // pas de rejoin possible → on n'attache pas de handler
                      // (rend le seat visuellement désactivé).
                      if (seat.isEmpty && tournamentRunning) return undefined;
                      return () => {
                        if (!seat.isEmpty) return;
                        onJoinSeat(seat.position);
                      };
                    })()}
                    onTimeOut={seat.isActivePlayer && gameState.phase !== "waiting" ? handleTimeOut : undefined}
                    timeLimit={30}
                  />
                </div>
              ))}

              {/* Side pots stratifiés affichés directement au centre via
                  CommunityCards.sidePots (calculé dans liveSidePots). */}

              {/* Showdown : animation centre→gagnant pour chaque side pot.
                  L'orchestrateur (showdownPotIndex) avance de pot en pot. */}
              {currentShowdownPot && (
                <PotFlyToWinner
                  key={showdownPotIndex}
                  amount={currentShowdownPot.amount}
                  seatAngle={currentShowdownPot.seatAngle}
                  isMobile={isMobile}
                  onAnimationEnd={() => {
                    /* l'avance vers le pot suivant est gérée par l'effect setTimeout */
                  }}
                />
              )}

            </div>
          </div>

          {/* Betting controls
              - Portrait : flow normal sous la table
              - Paysage  : overlay fixe en bas (drawer-like) pour ne pas
                rapetisser la table en hauteur déjà contrainte */}
          {currentPlayer &&
            isMyTurn &&
            gameState.phase !== "waiting" &&
            availableActions.length > 0 && (
              <div className={cn(
                isLandscape
                  ? "fixed bottom-0 left-0 right-0 z-30 px-1 pb-[env(safe-area-inset-bottom)] bg-black/60 backdrop-blur-sm border-t border-poker-green-700"
                  : cn("w-full", isMobile ? "mt-0 max-w-none" : "mt-6 max-w-4xl")
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

        {/* Panneau Joueurs / Historique / Chat — désormais un drawer
            unifié sur toutes les tailles d'écran, ouvert via l'icône Users
            du header. */}

        {/* Mobile : la navbar verticale et le menu modal ont été retirés.
            Le top header mobile (plus haut) + les drawers (Chat/Paramètres/
            Actions/Infos) couvrent désormais ces fonctions. */}

        {/* Tournament terminé : scoreboard final + bouton 'Retour au lobby'.
            Le showdown de main est géré sur le tapis lui-même. */}
        {table.gameType === "tournament" &&
          table.modules?.tournament?.status === "finished" && (
            <TournamentScoreboard
              table={table}
              players={players}
              onBackToLobby={onLeaveTable}
            />
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
        <Drawer
          isOpen={showTablePanelDrawer}
          onClose={() => setShowTablePanelDrawer(false)}
          title="Joueurs / Historique / Chat"
        >
          <TableRightPanel
            actions={actionHistory as unknown[] ?? []}
            players={playersForPanel}
            tableId={table._id}
            currentUserId={authUser?._id ?? null}
            isSeated={!!currentPlayer}
          />
        </Drawer>
        <SettingsDrawer
          isOpen={showSettingsDrawer}
          onClose={() => setShowSettingsDrawer(false)}
        />
      </div>
    </div>
  );
};
