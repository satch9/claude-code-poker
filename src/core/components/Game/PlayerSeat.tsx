import React, { useEffect, useRef, useState } from "react";
import { Card } from "../UI/Card";
import { Player } from "../../../shared/types";
import { cn } from "../../../shared/utils/cn";
import { PlayerTimer } from "./PlayerTimer";
import { PlayerSeatEmpty } from "./PlayerSeatEmpty";
import { BlindBadge } from "./BlindBadge";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useResponsiveClasses } from "../../hooks/useResponsiveClasses";
import { PlayerAvatar } from "./PlayerAvatar";

interface PlayerSeatProps {
  player?: Player;
  position: number;
  seatAngle?: number;
  isDealer?: boolean;
  isCurrentPlayer?: boolean;
  isActivePlayer?: boolean; // C'est au tour de ce joueur de jouer
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  smallBlindAmount?: number;
  bigBlindAmount?: number;
  showCards?: boolean;
  // Cartes révélées au showdown (override player.cards qui est masqué par
  // sanitizePlayer côté serveur). Utilisées uniquement quand showCards=true.
  revealedCards?: string[];
  // Aura "winner-glow" autour du siège gagnant pendant le showdown.
  isShowdownWinner?: boolean;
  isEmpty?: boolean;
  onSeatClick?: () => void;
  onTimeOut?: () => void;
  timeLimit?: number;
  className?: string;
}

const PlayerSeatComponent: React.FC<PlayerSeatProps> = ({
  player,
  position: _position,
  seatAngle,
  isDealer: _isDealer = false,
  isCurrentPlayer = false,
  isActivePlayer = false,
  isSmallBlind = false,
  isBigBlind = false,
  smallBlindAmount: _smallBlindAmount = 0,
  bigBlindAmount: _bigBlindAmount = 0,
  showCards = false,
  revealedCards,
  isShowdownWinner = false,
  isEmpty = false,
  onSeatClick,
  onTimeOut,
  timeLimit = 30,
  className,
}) => {
  const { isMobile } = useBreakpoint();
  const responsiveClasses = useResponsiveClasses();

  // Push-to-pot animation: déclenchée quand currentBet repasse à 0 après avoir été > 0
  const prevBetRef = useRef<number>(0);
  const [pushingToPot, setPushingToPot] = useState(false);
  const [pushAmount, setPushAmount] = useState(0);
  // Vecteur de push : depuis la position du seat vers le centre.
  // seatAngle pointe du centre vers le seat ; on inverse pour aller vers le centre.
  const pushVector = React.useMemo(() => {
    if (seatAngle === undefined) return { dx: "0px", dy: "-60px" };
    const dist = isMobile ? 70 : 110;
    return {
      dx: `${-Math.cos(seatAngle) * dist}px`,
      dy: `${-Math.sin(seatAngle) * dist}px`,
    };
  }, [seatAngle, isMobile]);

  useEffect(() => {
    const currentBet = player?.currentBet ?? 0;
    const prev = prevBetRef.current;
    if (prev > 0 && currentBet === 0) {
      setPushAmount(prev);
      setPushingToPot(true);
      const t = setTimeout(() => setPushingToPot(false), 700);
      return () => clearTimeout(t);
    }
    prevBetRef.current = currentBet;
  }, [player?.currentBet]);

  if (isEmpty) {
    return <PlayerSeatEmpty onClick={onSeatClick ?? (() => {})} className={className} />;
  }

  if (!player) return null;

  // Chip stack calculation (unused for now)
  // const chipStack = [
  //   { value: 1000, count: Math.floor(player.chips / 1000) },
  //   { value: 100, count: Math.floor((player.chips % 1000) / 100) },
  //   { value: 25, count: Math.floor((player.chips % 100) / 25) },
  //   { value: 5, count: Math.floor((player.chips % 25) / 5) },
  // ].filter((chip) => chip.count > 0);

  return (
    <>
      {/* Cards positioned first with conditional z-index and positioning */}
      <div
        className={cn(
          "absolute flex",
          // Z-index selon le type de joueur
          showCards ? "z-card-visible" : "z-card-hidden",
          // Espacement pour toutes les cartes (côte à côte)
          responsiveClasses.cardClasses.spacing
        )}
        style={{
          ...(seatAngle !== undefined ? getCardsStyleFromAngle(seatAngle, isCurrentPlayer, showCards) : {}),
        }}
      >
        {(() => {
          // Au showdown, les cartes adverses sont sanitizées dans player.cards.
          // On utilise revealedCards (depuis getShowdownResults) si fourni.
          const cardsToRender =
            showCards && revealedCards && revealedCards.length > 0
              ? revealedCards
              : player.cards;
          return cardsToRender.length > 0 ? (
            cardsToRender.map((cardStr, index) => {
              const parsedCard = showCards ? parseCard(cardStr) : undefined;
              return (
                <Card
                  key={index}
                  card={parsedCard}
                  isHidden={!showCards}
                  size={isMobile ? "sm" : "md"}
                />
              );
            })
          ) : (
            <>
              <Card size={isMobile ? "sm" : "md"} />
              <Card size={isMobile ? "sm" : "md"} />
            </>
          );
        })()}
      </div>

      {/* Player seat box */}
      <div
        className={cn(
          "relative z-player-seat rounded-2xl",
          responsiveClasses.playerSeat,
          isCurrentPlayer && responsiveClasses.playerStates.current,
          isActivePlayer && responsiveClasses.playerStates.active,
          player.isFolded && responsiveClasses.playerStates.folded,
          player.isAllIn && responsiveClasses.playerStates.allIn,
          isShowdownWinner && "winner-glow",
          className
        )}
      >
        {/* Blind indicators */}
        {isSmallBlind && <BlindBadge type="small" />}
        {isBigBlind && <BlindBadge type="big" />}

        {/* Player avatar and info */}
        <div
          className={cn(
            "flex items-center h-full",
            isMobile ? "gap-1.5" : "gap-2"
          )}
        >
          <PlayerAvatar
            name={player.user?.name || 'Player'}
            isActive={isActivePlayer}
            isFolded={player.isFolded}
          />
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "font-medium text-white truncate",
                isMobile ? "text-xs leading-tight" : "text-sm"
              )}
            >
              {player.user?.name || "Player"}
            </div>
            <div
              className={cn(
                "text-green-400 font-bold truncate",
                isMobile ? "text-xs leading-tight" : "text-xs"
              )}
            >
              {isMobile
                ? player.chips >= 1000
                  ? `${Math.floor(player.chips / 1000)}K`
                  : player.chips.toString()
                : player.chips.toLocaleString()}
            </div>
            {!isMobile && player.lastAction && (
              <div className="text-xs text-gray-300 font-medium truncate">
                {getActionLabel(player.lastAction)}
              </div>
            )}
          </div>
        </div>

        {/* Animation push-to-pot: jetons partent vers le centre quand currentBet repasse à 0 */}
        {pushingToPot && (
          <div
            className={cn(
              "absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 chips-push-to-pot pointer-events-none",
              isMobile ? "-bottom-2" : "-bottom-3"
            )}
            style={{
              ["--push-dx" as any]: pushVector.dx,
              ["--push-dy" as any]: pushVector.dy,
            }}
          >
            <div className="relative" style={{ width: isMobile ? 14 : 18, height: isMobile ? 14 : 18 }}>
              <div className="absolute inset-0 rounded-full border border-black/40" style={{ background: "radial-gradient(circle at 30% 30%, #fca5a5 0%, #dc2626 50%, #7f1d1d 100%)", transform: "translateY(-3px)" }} />
              <div className="absolute inset-0 rounded-full border border-black/40" style={{ background: "radial-gradient(circle at 30% 30%, #93c5fd 0%, #2563eb 50%, #1e3a8a 100%)", transform: "translateY(-1px)" }} />
              <div className="absolute inset-0 rounded-full border border-black/40" style={{ background: "radial-gradient(circle at 30% 30%, #fde68a 0%, #f59e0b 50%, #92400e 100%)" }} />
            </div>
            <div className={cn("bg-black/70 text-white rounded-full font-bold whitespace-nowrap", isMobile ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs")}>
              {pushAmount.toLocaleString()}
            </div>
          </div>
        )}

        {/* Current bet indicator — pile de jetons style PokerStars */}
        {player.currentBet > 0 && (
          <div
            className={cn(
              "absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1",
              isMobile ? "-bottom-2" : "-bottom-3"
            )}
          >
            {/* Pile de jetons graphique */}
            <div className="relative" style={{ width: isMobile ? 14 : 18, height: isMobile ? 14 : 18 }}>
              <div
                className="absolute inset-0 rounded-full border border-black/40"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #fca5a5 0%, #dc2626 50%, #7f1d1d 100%)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  transform: "translateY(-3px)",
                }}
              />
              <div
                className="absolute inset-0 rounded-full border border-black/40"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #93c5fd 0%, #2563eb 50%, #1e3a8a 100%)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  transform: "translateY(-1px)",
                }}
              />
              <div
                className="absolute inset-0 rounded-full border border-black/40"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #fde68a 0%, #f59e0b 50%, #92400e 100%)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                }}
              />
            </div>
            <div
              className={cn(
                "bg-black/70 text-white rounded-full font-bold shadow-lg whitespace-nowrap",
                isMobile ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs"
              )}
            >
              {isMobile && player.currentBet >= 1000
                ? `${Math.floor(player.currentBet / 1000)}K`
                : player.currentBet.toLocaleString()}
            </div>
          </div>
        )}

        {/* All-in indicator */}
        {player.isAllIn && (
          <div className="absolute inset-0 bg-red-500/20 rounded-xl flex items-center justify-center">
            <span
              className={cn(
                "bg-red-600 text-white rounded-full font-bold shadow-lg",
                isMobile ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs"
              )}
            >
              ALL-IN
            </span>
          </div>
        )}

        {/* Player timer */}
        {isActivePlayer && onTimeOut && (
          <div
            className={cn(
              "absolute top-1/2 transform -translate-y-1/2",
              isMobile ? "-left-6" : "-left-8"
            )}
          >
            <PlayerTimer
              isActive={isActivePlayer}
              timeLimit={timeLimit}
              onTimeOut={onTimeOut}
            />
          </div>
        )}
      </div>
    </>
  );
};

export const PlayerSeat = React.memo(PlayerSeatComponent, (prev, next) => {
  // Re-render uniquement si une prop "visible" change.
  if (
    prev.isEmpty !== next.isEmpty ||
    prev.isDealer !== next.isDealer ||
    prev.isCurrentPlayer !== next.isCurrentPlayer ||
    prev.isActivePlayer !== next.isActivePlayer ||
    prev.isSmallBlind !== next.isSmallBlind ||
    prev.isBigBlind !== next.isBigBlind ||
    prev.showCards !== next.showCards ||
    prev.isShowdownWinner !== next.isShowdownWinner ||
    prev.seatAngle !== next.seatAngle ||
    prev.timeLimit !== next.timeLimit ||
    prev.smallBlindAmount !== next.smallBlindAmount ||
    prev.bigBlindAmount !== next.bigBlindAmount ||
    prev.className !== next.className ||
    prev.onSeatClick !== next.onSeatClick ||
    prev.onTimeOut !== next.onTimeOut
  ) {
    return false; // re-render
  }
  // revealedCards: shallow compare by length + content
  const ra = prev.revealedCards ?? [];
  const rb = next.revealedCards ?? [];
  if (ra.length !== rb.length) return false;
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] !== rb[i]) return false;
  }
  // Player object: comparer les champs visibles
  const a = prev.player;
  const b = next.player;
  if (!a && !b) return true; // both empty, equal
  if (!a || !b) return false; // one empty, one not
  if (
    a.userId !== b.userId ||
    a.chips !== b.chips ||
    a.isFolded !== b.isFolded ||
    a.isAllIn !== b.isAllIn ||
    a.currentBet !== b.currentBet ||
    a.lastAction !== b.lastAction ||
    a.user?.name !== b.user?.name
  ) {
    return false;
  }
  // Cards array (length + content)
  const ac = a.cards ?? [];
  const bc = b.cards ?? [];
  if (ac.length !== bc.length) return false;
  for (let i = 0; i < ac.length; i++) {
    if (ac[i] !== bc[i]) return false;
  }
  return true; // skip re-render
});

// Utility functions
function parseCard(cardStr: string) {
  if (!cardStr || cardStr.length < 2) return undefined;

  const rank = cardStr.slice(0, -1) as any;
  const suitChar = cardStr.slice(-1);

  const suitMap: Record<string, any> = {
    h: "hearts",
    d: "diamonds",
    c: "clubs",
    s: "spades",
  };

  return {
    rank,
    suit: suitMap[suitChar.toLowerCase()],
  };
}

// Utility function for action colors (unused currently)
// function getActionColor(action: string) {
//   switch (action) {
//     case "fold":
//       return "bg-red-100 text-red-800";
//     case "check":
//       return "bg-gray-100 text-gray-800";
//     case "call":
//       return "bg-blue-100 text-blue-800";
//     case "raise":
//       return "bg-green-100 text-green-800";
//     case "all-in":
//       return "bg-purple-100 text-purple-800";
//     default:
//       return "bg-gray-100 text-gray-800";
//   }
// }

function getActionLabel(action: string) {
  switch (action) {
    case "fold":
      return "FOLD";
    case "check":
      return "CHECK";
    case "call":
      return "CALL";
    case "raise":
      return "RAISE";
    case "all-in":
      return "ALL-IN";
    default:
      return action.toUpperCase();
  }
}

function getCardsStyleFromAngle(angleRad: number, isCurrentPlayer: boolean = false, showCards: boolean = false) {
  // Décale les cartes légèrement vers le centre de la table selon l'angle du siège
  // Les seats sont centrés via translate(-50%, -50%), on ajoute un offset relatif
  const baseDist = isCurrentPlayer ? 24 : 16; // joueur courant un peu plus visible - pourrait utiliser responsiveClasses.cardOffsets
  const dx = Math.cos(angleRad) * (-baseDist); // vers le centre = opposé au rayon
  const dy = Math.sin(angleRad) * (-baseDist);

  // Ajustement additionnel pour les cartes du joueur courant selon la position
  const extraOffsetX = 0;
  let extraOffsetY = 0;

  if (showCards) {
    // Ajustement léger selon l'angle pour harmoniser le dépassement
    const adjustmentDistance = 25;

    // Angle approximatif pour différencier les positions
    const normalizedAngle = ((angleRad % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

    if (normalizedAngle < Math.PI / 4 || normalizedAngle > 7 * Math.PI / 4) {
      // Est (droite) - angle ~ 0
      extraOffsetY = -adjustmentDistance;
    } else if (normalizedAngle < 3 * Math.PI / 4) {
      // Sud (bas) - angle ~ π/2
      extraOffsetY = -adjustmentDistance * -0.3;
    } else if (normalizedAngle < 5 * Math.PI / 4) {
      // Ouest (gauche) - angle ~ π
      extraOffsetY = -adjustmentDistance;
    } else {
      // Nord (haut) - angle ~ 3π/2
      extraOffsetY = -adjustmentDistance * 1.9; // Un peu plus pour le nord
    }
  }

  // Position de base avec ajustements
  const finalDx = dx + extraOffsetX;
  const finalDy = dy + extraOffsetY;
  const baseTransform = `translate(-50%, -50%) translate(${finalDx}px, ${finalDy}px)`;

  return {
    left: '50%',
    top: '50%',
    transform: baseTransform,
  } as React.CSSProperties;
}
