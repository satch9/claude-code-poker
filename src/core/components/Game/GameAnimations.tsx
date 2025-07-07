import React, { useState } from "react";
import { Card } from "../UI/Card";
import { Chip } from "../UI/Chip";
import { cn } from "../../../shared/utils/cn";
import { Card as CardType } from "../../../shared/types";

interface GameAnimationsProps {
  className?: string;
}

interface AnimationState {
  isDealing: boolean;
  dealingIndex: number;
  cards: CardType[];
  chipAnimation: boolean;
  potAnimation: boolean;
}

const GameAnimations: React.FC<GameAnimationsProps> = ({ className }) => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isDealing: false,
    dealingIndex: 0,
    cards: [],
    chipAnimation: false,
    potAnimation: false,
  });

  const sampleCards: CardType[] = [
    { suit: "hearts", rank: "A" },
    { suit: "spades", rank: "K" },
    { suit: "diamonds", rank: "Q" },
    { suit: "clubs", rank: "J" },
    { suit: "hearts", rank: "10" },
  ];

  // Animation de distribution des cartes
  const startCardDealing = () => {
    setAnimationState((prev) => ({
      ...prev,
      isDealing: true,
      dealingIndex: 0,
      cards: [],
    }));

    sampleCards.forEach((card, index) => {
      setTimeout(() => {
        setAnimationState((prev) => ({
          ...prev,
          cards: [...prev.cards, card],
          dealingIndex: index,
        }));
      }, index * 500);
    });

    setTimeout(() => {
      setAnimationState((prev) => ({
        ...prev,
        isDealing: false,
      }));
    }, sampleCards.length * 500);
  };

  // Animation des jetons
  const startChipAnimation = () => {
    setAnimationState((prev) => ({ ...prev, chipAnimation: true }));
    setTimeout(() => {
      setAnimationState((prev) => ({ ...prev, chipAnimation: false }));
    }, 1000);
  };

  // Animation du pot
  const startPotAnimation = () => {
    setAnimationState((prev) => ({ ...prev, potAnimation: true }));
    setTimeout(() => {
      setAnimationState((prev) => ({ ...prev, potAnimation: false }));
    }, 2000);
  };

  return (
    <div className={cn("p-8 space-y-8", className)}>
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Animations de Poker</h2>

        {/* Contrôles */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={startCardDealing}
            disabled={animationState.isDealing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {animationState.isDealing
              ? "Distribution..."
              : "Distribuer les cartes"}
          </button>

          <button
            onClick={startChipAnimation}
            disabled={animationState.chipAnimation}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Animer les jetons
          </button>

          <button
            onClick={startPotAnimation}
            disabled={animationState.potAnimation}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Animer le pot
          </button>
        </div>
      </div>

      {/* Zone de démonstration */}
      <div className="bg-poker-green-700 rounded-2xl p-8 min-h-96 relative overflow-hidden">
        {/* Cartes distribuées */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-2">
            {animationState.cards.map((card, index) => (
              <Card
                key={index}
                card={card}
                size="md"
                animation="deal"
                animationDelay={index * 100}
                className="card-deal-from-deck"
              />
            ))}
          </div>
        </div>

        {/* Paquet de cartes (source) */}
        <div className="absolute top-8 right-8">
          <Card
            isHidden
            size="md"
            className={cn(
              "transition-all duration-300",
              animationState.isDealing && "animate-pulse"
            )}
          />
        </div>

        {/* Zone des jetons */}
        <div className="absolute bottom-8 left-8 flex gap-2">
          {[100, 500, 1000].map((value, index) => (
            <Chip
              key={value}
              value={value}
              count={5}
              animation={animationState.chipAnimation ? 'bet' : 'none'}
              animationDelay={index * 200}
            />
          ))}
        </div>

        {/* Pot central */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div
            className={cn(
              "bg-white rounded-lg px-6 py-3 shadow-lg transition-all duration-1000",
              animationState.potAnimation && "scale-110 pot-glow"
            )}
          >
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">Pot</div>
              <div className="text-2xl font-bold text-green-600">2,500</div>
            </div>
          </div>
        </div>

        {/* Cartes des joueurs */}
        <div className="absolute bottom-8 right-8">
          <div className="flex gap-1">
            <Card
              card={{ suit: "hearts", rank: "A" }}
              size="sm"
              className={cn(
                "transition-all duration-300",
                animationState.isDealing && "card-slide"
              )}
            />
            <Card
              card={{ suit: "spades", rank: "K" }}
              size="sm"
              className={cn(
                "transition-all duration-300",
                animationState.isDealing && "card-slide"
              )}
              style={{ animationDelay: "200ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { GameAnimations };
