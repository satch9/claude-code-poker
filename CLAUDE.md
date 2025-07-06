# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Recommandations

à chaque étape de la création tu créés un commit pour faire le suivi
mon user.email "viny1976@gmail.com" et mon user.name "satch9"

## Project Overview

This is a multi-player Texas Hold'em No Limit poker application project currently in the planning phase. The project aims to build a real-time web application with the following stack:

- **Frontend**: Vite.js + React + TypeScript
- **Backend/Database**: Convex (real-time + database)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Convex Queries/Mutations

## Architecture

The application follows a **modular architecture** with:

### Core Modules (Required)

- **AuthModule**: User management and authentication
- **GameEngineModule**: Core poker logic (cards, hands, rounds)
- **TableModule**: Table management and player seating
- **NetworkModule**: Real-time communication via Convex

### Optional Modules (Activatable on demand)

- **TournamentModule**: Tournament management and blind structures
- **InvitationModule**: Invitation system
- **NotificationModule**: Notifications and alerts
- **ChatModule**: Chat system (future)
- **StatisticsModule**: Statistics and history (future)

## Key Features

### Game Mechanics

- **Phases**: Pre-flop, flop, turn, river, showdown
- **Betting Actions**: Fold, check, call, raise, all-in
- **Special Rules**: Heads-up blind handling, side pots
- **Tournament Support**: Progressive blind structures with automatic calculation

### Invitation System

- **Email Invitations**: Direct email invites with links
- **Shareable Links**: Auto-generated invitation URLs
- **Invitation Codes**: Short 6-character codes
- **Real-time Status**: Live invitation tracking

### Blind Structure Calculation

The system automatically calculates optimal blind structures based on:

- Target duration (1h, 1h30, 2h, 2h30)
- Blind level intervals (5-20 minutes)
- Number of players
- Buy-in amount

## Project Structure

```
convex/
├── core/                 # Core game logic
│   ├── schema.ts         # Extensible base schemas
│   ├── gameEngine.ts     # Core poker engine
│   ├── auth.ts          # Authentication
│   └── tables.ts        # Table management
├── modules/             # Optional modules
│   ├── tournaments/     # Tournament system
│   ├── invitations/     # Invitation system
│   ├── notifications/   # Notification system
│   └── chat/           # Chat system (future)
├── shared/             # Shared utilities
│   ├── types.ts        # Common types
│   ├── constants.ts    # Global constants
│   └── validation.ts   # Validation functions
└── utils/
    ├── poker.ts        # Poker business logic
    ├── handRanking.ts  # Hand evaluation
    └── moduleRegistry.ts # Module manager

src/
├── core/
│   ├── components/     # Core game components
│   ├── hooks/         # Core hooks
│   └── utils/         # Core utilities
├── modules/           # Module-specific components
│   ├── tournaments/   # Tournament UI
│   ├── invitations/   # Invitation UI
│   └── notifications/ # Notification UI
├── shared/           # Shared components
└── config/
    ├── modules.ts    # Module configuration
    └── features.ts   # Feature flags
```

## Development Commands

_Note: No package.json exists yet. These commands will be updated once the project is initialized._

Expected commands once setup:

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck

# Test
npm run test
```

## Key Technical Decisions

### Hand Evaluation

- **Recommended Library**: `pokersolver` for hand evaluation
- **Reason**: Stable, well-tested, production-ready
- **Installation**: `npm install pokersolver`

### Email Service

- **Options**: Resend or SendGrid for invitation emails
- **Purpose**: Sending invitation emails to players

### Validation

- **Library**: Zod for TypeScript data validation
- **Usage**: Input validation and type safety

## Module System

The application uses a plugin-based architecture where modules can be enabled/disabled via configuration:

```typescript
// Example module configuration
export const MODULE_CONFIG = {
  enabledModules: ["tournaments", "invitations", "notifications"],
  moduleConfigs: {
    tournaments: { enabled: true, settings: { maxDuration: 150 } },
    invitations: { enabled: true, settings: { maxInvitationsPerTable: 10 } },
  },
};
```

## Development Phases

### Phase 1: MVP (5-7 weeks)

- Basic authentication
- Simple invitation system (by code)
- Basic notifications
- 2-player tables (heads-up)
- Core game mechanics

### Phase 2: Extended Features (4-5 weeks)

- Email invitations
- Shareable links
- Tables up to 9 players
- Complete blind system
- Side pot handling

### Phase 3: Polish (2-3 weeks)

- Animations and transitions
- Chat system
- Player statistics
- Advanced invitation management

## Security Considerations

- **Server-side Validation**: All game actions must be validated server-side
- **Card Security**: Private cards must be secured from client access
- **Anti-cheating**: All player actions require validation
- **Invitation Security**: Cryptographically secure invitation codes
- **Rate Limiting**: Prevent invitation spam

## Testing Strategy

- **Unit Tests**: >80% coverage on business logic
- **Integration Tests**: Complete game scenarios
- **Hand Evaluation Tests**: Comprehensive poker hand testing
- **Real-time Tests**: Synchronization and state consistency

## Performance Targets

- **Latency**: Player actions <100ms
- **Synchronization**: 99.9% real-time updates
- **Stability**: <1% unhandled disconnections
- **Invitation Delivery**: 98% invitation success rate
