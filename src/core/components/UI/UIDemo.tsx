import React, { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Chip, ChipStack } from './Chip';
import { Card as CardType } from '../../../shared/types';

const UIDemo: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const sampleCards: CardType[] = [
    { suit: 'hearts', rank: 'A' },
    { suit: 'spades', rank: 'K' },
    { suit: 'diamonds', rank: 'Q' },
    { suit: 'clubs', rank: 'J' },
    { suit: 'hearts', rank: '10' },
  ];

  const chipStack = [
    { value: 1000, count: 5 },
    { value: 500, count: 3 },
    { value: 100, count: 8 },
    { value: 25, count: 12 },
    { value: 5, count: 20 },
  ];

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-poker-green-800 to-poker-green-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Composants UI Poker
        </h1>

        {/* Buttons Section */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Boutons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Fold</Button>
            <Button variant="secondary">Check</Button>
            <Button variant="success">Call</Button>
            <Button variant="danger">All-in</Button>
            <Button variant="ghost">Raise</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button 
              variant="primary" 
              loading={loading}
              onClick={handleAction}
            >
              {loading ? 'Processing...' : 'Start Action'}
            </Button>
          </div>
        </div>

        {/* Cards Section */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Cartes</h2>
          
          <div className="space-y-6">
            {/* Player Cards */}
            <div>
              <h3 className="text-lg font-medium mb-2">Cartes du joueur</h3>
              <div className="flex gap-2">
                {sampleCards.slice(0, 2).map((card, index) => (
                  <Card
                    key={index}
                    card={card}
                    size="lg"
                    isHighlighted={selectedCard === index}
                    onClick={() => setSelectedCard(index === selectedCard ? null : index)}
                  />
                ))}
              </div>
            </div>

            {/* Community Cards */}
            <div>
              <h3 className="text-lg font-medium mb-2">Cartes communes (Flop, Turn, River)</h3>
              <div className="flex gap-2">
                {sampleCards.map((card, index) => (
                  <Card key={index} card={card} size="md" />
                ))}
              </div>
            </div>

            {/* Hidden Cards */}
            <div>
              <h3 className="text-lg font-medium mb-2">Cartes cachées</h3>
              <div className="flex gap-2">
                <Card isHidden size="md" />
                <Card isHidden size="md" />
                <Card size="sm" /> {/* Empty slot */}
              </div>
            </div>
          </div>
        </div>

        {/* Chips Section */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Jetons</h2>
          
          <div className="space-y-6">
            {/* Individual Chips */}
            <div>
              <h3 className="text-lg font-medium mb-2">Jetons individuels</h3>
              <div className="flex gap-4 items-center">
                <Chip value={5} />
                <Chip value={25} />
                <Chip value={100} />
                <Chip value={500} />
                <Chip value={1000} />
                <Chip value={5000} />
                <Chip value={25000} />
              </div>
            </div>

            {/* Stacked Chips */}
            <div>
              <h3 className="text-lg font-medium mb-2">Piles de jetons</h3>
              <div className="flex gap-4 items-center">
                <Chip value={100} count={5} />
                <Chip value={500} count={10} />
                <Chip value={1000} count={25} />
              </div>
            </div>

            {/* Chip Stack */}
            <div>
              <h3 className="text-lg font-medium mb-2">Stack de jetons complet</h3>
              <ChipStack 
                chips={chipStack}
                onClick={(value) => console.log(`Clicked chip: ${value}`)}
              />
            </div>

            {/* Different Sizes */}
            <div>
              <h3 className="text-lg font-medium mb-2">Tailles différentes</h3>
              <div className="flex gap-4 items-center">
                <Chip value={100} size="sm" />
                <Chip value={100} size="md" />
                <Chip value={100} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Poker Table Preview */}
        <div className="bg-poker-green-700 rounded-full p-8 mx-auto max-w-2xl">
          <div className="text-center text-white mb-4">
            <h3 className="text-lg font-semibold">Aperçu table de poker</h3>
          </div>
          
          {/* Community Cards */}
          <div className="flex justify-center gap-2 mb-6">
            {sampleCards.map((card, index) => (
              <Card key={index} card={card} size="sm" />
            ))}
          </div>
          
          {/* Pot */}
          <div className="text-center mb-4">
            <div className="bg-white rounded-lg px-4 py-2 inline-block">
              <span className="text-lg font-bold text-gray-800">Pot: 2,500</span>
            </div>
          </div>
          
          {/* Player Position */}
          <div className="flex justify-center">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="flex gap-2 justify-center mb-2">
                <Card card={sampleCards[0]} size="sm" />
                <Card card={sampleCards[1]} size="sm" />
              </div>
              <div className="text-sm font-medium text-gray-800 mb-2">Player 1</div>
              <ChipStack 
                chips={[{ value: 100, count: 5 }, { value: 25, count: 8 }]}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { UIDemo };