// Types personnalisés pour pokersolver
declare module 'pokersolver' {
  export interface PokerHand {
    name: string;
    descr: string;
    rank: number;
    cards: PokerCard[];
    qualifiesLow(): boolean;
    toString(): string;
  }

  export interface PokerCard {
    value: string;
    suit: string;
    rank: number;
    toString(): string;
  }

  export class Hand {
    static solve(cards: string[], game?: string, canDisqualify?: boolean): PokerHand;
    static winners(hands: PokerHand[]): PokerHand[];
  }

  export const games: string[];
}