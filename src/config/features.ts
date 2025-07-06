// Feature flags for A/B testing and gradual rollouts
export const FEATURE_FLAGS = {
  // Core features
  ENABLE_USER_AVATARS: true,
  ENABLE_TABLE_THEMES: false,
  ENABLE_SOUND_EFFECTS: false,
  
  // Game features
  ENABLE_SIDE_POTS: true,
  ENABLE_ALL_IN_PROTECTION: true,
  ENABLE_HAND_HISTORY: false,
  
  // UI features
  ENABLE_ANIMATIONS: true,
  ENABLE_CARD_ANIMATIONS: true,
  ENABLE_CHIP_ANIMATIONS: false,
  ENABLE_DARK_MODE: false,
  
  // Social features
  ENABLE_FRIEND_SYSTEM: false,
  ENABLE_PLAYER_NOTES: false,
  ENABLE_EMOJI_REACTIONS: false,
  
  // Performance features
  ENABLE_OPTIMISTIC_UPDATES: true,
  ENABLE_PRELOADING: false,
  ENABLE_CACHING: true,
  
  // Development features
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
  ENABLE_MOCK_DATA: false,
  ENABLE_PERFORMANCE_METRICS: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}

// Environment-specific overrides
export function getFeatureOverrides() {
  if (process.env.NODE_ENV === 'development') {
    return {
      ENABLE_DEBUG_MODE: true,
      ENABLE_MOCK_DATA: true,
    };
  }
  
  if (process.env.NODE_ENV === 'test') {
    return {
      ENABLE_ANIMATIONS: false,
      ENABLE_SOUND_EFFECTS: false,
      ENABLE_MOCK_DATA: true,
    };
  }
  
  return {};
}