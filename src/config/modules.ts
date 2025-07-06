import { AppConfig, ModuleName } from '../shared/types';

// Module configuration - controls which features are enabled
export const MODULE_CONFIG: AppConfig = {
  // MVP Phase 1: Core modules only
  enabledModules: ["invitations", "notifications"],
  
  moduleConfigs: {
    tournaments: {
      enabled: false, // Disabled for MVP
      settings: {
        maxDuration: 150, // minutes
        defaultBlindInterval: 10, // minutes
        allowCustomStructures: false,
        maxPlayersPerTournament: 9,
      },
      dependencies: ["notifications"],
    },
    
    invitations: {
      enabled: true,
      settings: {
        maxInvitationsPerTable: 10,
        invitationExpiry: 1440, // minutes (24h)
        emailService: "resend", // or "sendgrid"
        allowPublicTables: true,
      },
      dependencies: ["notifications"],
    },
    
    notifications: {
      enabled: true,
      settings: {
        enablePushNotifications: true,
        enableEmailNotifications: false, // Disabled for MVP
        reminderDelay: 60, // minutes
        maxNotificationsPerUser: 50,
      },
    },
    
    chat: {
      enabled: false, // Future feature
      settings: {
        maxMessageLength: 200,
        moderationEnabled: true,
        allowEmojis: true,
        chatHistoryLimit: 100,
      },
      dependencies: ["notifications"],
    },
    
    statistics: {
      enabled: false, // Future feature
      settings: {
        trackHandHistory: true,
        enableAnalytics: true,
        retentionPeriod: 30, // days
        enableExport: false,
      },
    },
    
    spectator: {
      enabled: false, // Future feature
      settings: {
        maxSpectatorsPerTable: 10,
        allowPublicSpectating: false,
        spectatorChat: false,
      },
      dependencies: ["chat"],
    },
    
    bots: {
      enabled: false, // Future feature
      settings: {
        difficultyLevels: ["easy", "medium", "hard"],
        enableBotChat: false,
        maxBotsPerTable: 2,
      },
      dependencies: ["chat"],
    },
  },
};

// Utility functions for module management
export function isModuleEnabled(moduleName: ModuleName): boolean {
  return MODULE_CONFIG.enabledModules.includes(moduleName);
}

export function getModuleConfig(moduleName: ModuleName) {
  return MODULE_CONFIG.moduleConfigs[moduleName];
}

export function getModuleSetting(moduleName: ModuleName, settingKey: string) {
  const config = getModuleConfig(moduleName);
  return config?.settings[settingKey];
}

// Check if all dependencies for a module are enabled
export function areModuleDependenciesMet(moduleName: ModuleName): boolean {
  const config = getModuleConfig(moduleName);
  if (!config?.dependencies) return true;
  
  return config.dependencies.every(dep => isModuleEnabled(dep));
}

// Get list of modules that depend on a given module
export function getModuleDependents(moduleName: ModuleName): ModuleName[] {
  return Object.entries(MODULE_CONFIG.moduleConfigs)
    .filter(([_, config]) => config.dependencies?.includes(moduleName))
    .map(([name]) => name as ModuleName);
}