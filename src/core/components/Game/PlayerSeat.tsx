import React from "react";
import { Card } from "../UI/Card";
import { Player } from "../../../shared/types";
import { cn } from "../../../shared/utils/cn";
import { PlayerTimer } from "./PlayerTimer";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useResponsiveClasses } from "../../hooks/useResponsiveClasses";

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
  isEmpty?: boolean;
  onSeatClick?: () => void;
  onTimeOut?: () => void;
  timeLimit?: number;
  className?: string;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
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
  isEmpty = false,
  onSeatClick,
  onTimeOut,
  timeLimit = 30,
  className,
}) => {
  const { isMobile } = useBreakpoint();
  const responsiveClasses = useResponsiveClasses();
  if (isEmpty) {
    return (
      <div
        className={cn(
          "bg-gray-700/50 border-2 border-dashed border-gray-500 rounded-2xl hover:bg-gray-600/50 cursor-pointer transition-all duration-200 ",
          isMobile ? "p-2" : "p-3",
          className
        )}
        onClick={onSeatClick}
      >
        <div className="text-center">
          <div
            className={cn(
              "bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-300",
              isMobile ? "w-8 h-8" : "w-12 h-12"
            )}
          >
            <svg
              className={cn(isMobile ? "w-4 h-4" : "w-6 h-6")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div
            className={cn(
              "font-medium text-gray-300",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            {isMobile ? "Libre" : "Siège libre"}
          </div>
          <div
            className={cn("text-gray-400", isMobile ? "text-xs" : "text-xs")}
          >
            {isMobile ? "Rejoindre" : "Cliquez pour rejoindre"}
          </div>
        </div>
      </div>
    );
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
        {player.cards.length > 0 ? (
          player.cards.map((cardStr, index) => {
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
        )}
      </div>

      {/* Player seat box */}
      <div
        className={cn(
          "relative z-player-seat",
          responsiveClasses.playerSeat,
          isCurrentPlayer && responsiveClasses.playerStates.current,
          isActivePlayer && responsiveClasses.playerStates.active,
          player.isFolded && responsiveClasses.playerStates.folded,
          player.isAllIn && responsiveClasses.playerStates.allIn,
          className
        )}
      >
        {/* Blind indicators */}
        {(isSmallBlind || isBigBlind) && (
          <div
            className={cn(
              "absolute -top-2 -left-2 text-white rounded-full flex items-center justify-center font-bold shadow-lg whitespace-nowrap border-2 border-white",
              isSmallBlind 
                ? "bg-orange-500" // Orange pour Small Blind
                : "bg-red-600",   // Rouge pour Big Blind
              isMobile
                ? "min-w-[24px] h-5 text-xs px-1.5"
                : "min-w-[28px] h-6 text-xs px-2"
            )}
          >
            {isSmallBlind ? "SB" : "BB"}
          </div>
        )}

        {/* Player avatar and info */}
        <div
          className={cn(
            "flex items-center h-full",
            isMobile ? "gap-1.5" : "gap-2"
          )}
        >
          <div
            className={cn(
              "bg-blue-500 rounded-full flex items-center justify-center text-white font-bold",
              isMobile ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm"
            )}
          >
            {(player.user?.name || "Player").charAt(0).toUpperCase()}
          </div>
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

        {/* Current bet indicator */}
        {player.currentBet > 0 && (
          <div
            className={cn(
              "absolute left-1/2 transform -translate-x-1/2",
              isMobile ? "-bottom-1" : "-bottom-2"
            )}
          >
            <div
              className={cn(
                "bg-red-500 text-white rounded-full font-bold shadow-lg whitespace-nowrap",
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
  let extraOffsetX = 0;
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
