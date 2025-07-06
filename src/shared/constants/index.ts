import { ModuleName } from '../types';

// Game constants
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const PLAYER_ACTIONS = ['fold', 'check', 'call', 'raise', 'all-in'] as const;
export const GAME_PHASES = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'] as const;

// Timing constants
export const ACTION_TIMEOUT = 30; // seconds
export const BLIND_INCREASE_INTERVALS = [5, 10, 15, 20]; // minutes
export const TOURNAMENT_DURATIONS = [60, 90, 120, 150]; // minutes

// Default values
export const DEFAULT_STARTING_CHIPS = 10000;
export const DEFAULT_BUY_IN_MULTIPLIER = 100; // buyIn * 100 = starting chips in tournament
export const DEFAULT_SMALL_BLIND = 10;
export const DEFAULT_BIG_BLIND = 20;

// Table limits
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 9;
export const MAX_TABLES_PER_USER = 5;

// Invitation constants
export const INVITATION_EXPIRY_HOURS = 24;
export const MAX_INVITATIONS_PER_TABLE = 10;
export const INVITE_CODE_LENGTH = 6;

// Module configuration
export const AVAILABLE_MODULES: ModuleName[] = [
  'tournaments',
  'invitations', 
  'notifications',
  'chat',
  'statistics',
  'spectator',
  'bots'
];

// Default blind structures
export const BLIND_PROGRESSIONS = {
  fast: {
    multiplier: 2,
    intervals: [5, 6, 7, 8],
  },
  normal: {
    multiplier: 1.5,
    intervals: [10, 12, 15],
  },
  slow: {
    multiplier: 1.3,
    intervals: [15, 18, 20],
  },
} as const;

// Prize structures by player count
export const DEFAULT_PRIZE_STRUCTURES = {
  2: [{ position: 1, percentage: 100 }],
  3: [{ position: 1, percentage: 100 }],
  4: [
    { position: 1, percentage: 60 },
    { position: 2, percentage: 40 },
  ],
  5: [
    { position: 1, percentage: 60 },
    { position: 2, percentage: 40 },
  ],
  6: [
    { position: 1, percentage: 60 },
    { position: 2, percentage: 40 },
  ],
  7: [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ],
  8: [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ],
  9: [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 },
  ],
} as const;

// Card representations for pokersolver
export const CARD_SUITS_MAP = {
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
  spades: 's',
} as const;

// UI Constants
export const POKER_COLORS = {
  green: {
    50: '#f0f9f0',
    100: '#dcf2dc',
    200: '#bce4bc',
    300: '#8fd08f',
    400: '#5bb65b',
    500: '#3d9a3d',
    600: '#2d7d2d',
    700: '#256325',
    800: '#1e4f1e',
    900: '#1a4119',
  },
  gold: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
} as const;