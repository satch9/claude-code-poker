import { Id } from "convex/_generated/dataModel";

// Core game types
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type GameType = 'cash' | 'tournament';

export type TableStatus = 'waiting' | 'playing' | 'finished';

// User types
export interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  avatar?: string;
  avatarColor?: string;
  avatarImageId?: Id<"_storage">;
  createdAt: number;
  lastSeen?: number;
}

// Player types
export interface Player {
  _id: Id<"players">;
  userId: Id<"users">;
  tableId: Id<"tables">;
  seatPosition: number;
  chips: number;
  cards: string[];
  currentBet: number;
  hasActed: boolean;
  isAllIn: boolean;
  isFolded: boolean;
  lastAction?: PlayerAction;
  joinedAt: number;
  user?: User;
}

// Table types
export interface Table {
  _id: Id<"tables">;
  name: string;
  maxPlayers: number;
  gameType: GameType;
  buyIn?: number; // Montant payé pour participer (tournois uniquement)
  startingStack: number; // Jetons de départ reçus
  smallBlind: number;
  bigBlind: number;
  isPrivate: boolean;
  inviteCode?: string;
  creatorId: Id<"users">;
  status: TableStatus;
  createdAt: number;
  modules?: TableModuleData;
  playerCount?: number;
  isUserSeated?: boolean;
}

// Game state types
export interface GameState {
  _id: Id<"gameStates">;
  tableId: Id<"tables">;
  phase: GamePhase;
  communityCards: string[];
  pot: number;
  currentBet: number;
  dealerPosition: number;
  currentPlayerPosition: number;
  sidePots: SidePot[];
  updatedAt: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayers: Id<"users">[];
}

// Module system types
export type ModuleName = 
  | "tournaments" 
  | "invitations" 
  | "notifications" 
  | "chat" 
  | "statistics" 
  | "spectator"
  | "bots";

export interface ModuleConfig {
  enabled: boolean;
  settings: Record<string, any>;
  dependencies?: ModuleName[];
}

export interface AppConfig {
  enabledModules: ModuleName[];
  moduleConfigs: Record<ModuleName, ModuleConfig>;
}

// Table module data (extensible)
export interface TableModuleData {
  tournament?: TournamentData;
  invitations?: InvitationData;
  chat?: ChatData;
  spectators?: SpectatorData;
  [key: string]: any;
}

// Tournament module types
export interface TournamentData {
  blindStructure: BlindLevel[];
  currentBlindLevel: number;
  nextBlindIncrease: number;
  prizeStructure: PrizeLevel[];
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  duration: number; // in minutes
}

export interface PrizeLevel {
  position: number;
  percentage: number;
}

// Invitation module types
export interface InvitationData {
  maxInvitations: number;
  pendingInvitations: Id<"invitations">[];
}

export interface Invitation {
  _id: Id<"invitations">;
  tableId: Id<"tables">;
  fromUserId: Id<"users">;
  toEmail?: string;
  toUserId?: Id<"users">;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  expiresAt: number;
}

// Notification types
export type NotificationType = 'table_invitation' | 'game_start' | 'turn_reminder' | 'game_end';

export interface Notification {
  _id: Id<"notifications">;
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: number;
}

// Chat module types (future)
export interface ChatData {
  messages: ChatMessage[];
  allowedParticipants: Id<"users">[];
  chatEnabled: boolean;
}

export interface ChatMessage {
  _id: string;
  userId: Id<"users">;
  message: string;
  timestamp: number;
}

// Spectator module types (future)
export interface SpectatorData {
  spectators: Id<"users">[];
  maxSpectators: number;
  spectatorMode: 'public' | 'private' | 'disabled';
}

// Hand evaluation types
export interface EvaluatedHand {
  name: string;
  description: string;
  rank: number;
  cards: string[];
}