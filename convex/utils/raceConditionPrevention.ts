// Prévention des race conditions dans la gestion des tours
export interface ActionLock {
  tableId: string;
  playerId: string;
  actionType: string;
  timestamp: number;
  lockId: string;
}

export interface GameStateSnapshot {
  tableId: string;
  gameStateId: string;
  phase: string;
  currentPlayerPosition: number;
  currentBet: number;
  pot: number;
  timestamp: number;
  lockVersion: number; // Version pour optimistic locking
}

/**
 * Gestionnaire de verrous pour prévenir les actions simultanées
 */
export class ActionLockManager {
  private locks = new Map<string, ActionLock>();
  private readonly lockTimeout = 5000; // 5 secondes
  
  /**
   * Acquiert un verrou pour une action
   */
  async acquireLock(
    tableId: string, 
    playerId: string, 
    actionType: string
  ): Promise<{ success: boolean; lockId?: string; error?: string }> {
    
    const lockKey = `${tableId}_${playerId}`;
    const existingLock = this.locks.get(lockKey);
    
    // Nettoyer les verrous expirés
    if (existingLock && Date.now() - existingLock.timestamp > this.lockTimeout) {
      this.locks.delete(lockKey);
    }
    
    // Vérifier si un verrou actif existe
    const activeLock = this.locks.get(lockKey);
    if (activeLock) {
      return {
        success: false,
        error: `Player action already in progress: ${activeLock.actionType}`
      };
    }
    
    // Créer nouveau verrou
    const lockId = `${tableId}_${playerId}_${Date.now()}_${Math.random().toString(36)}`;
    const lock: ActionLock = {
      tableId,
      playerId,
      actionType,
      timestamp: Date.now(),
      lockId
    };
    
    this.locks.set(lockKey, lock);
    
    return { success: true, lockId };
  }
  
  /**
   * Libère un verrou
   */
  releaseLock(tableId: string, playerId: string, lockId: string): boolean {
    const lockKey = `${tableId}_${playerId}`;
    const existingLock = this.locks.get(lockKey);
    
    if (existingLock && existingLock.lockId === lockId) {
      this.locks.delete(lockKey);
      return true;
    }
    
    return false;
  }
  
  /**
   * Nettoie les verrous expirés
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (now - lock.timestamp > this.lockTimeout) {
        this.locks.delete(key);
      }
    }
  }
  
  /**
   * Obtient les verrous actifs pour une table
   */
  getActiveLocks(tableId: string): ActionLock[] {
    return Array.from(this.locks.values())
      .filter(lock => lock.tableId === tableId);
  }
}

/**
 * Gestionnaire de snapshots pour optimistic locking
 */
export class GameStateVersionManager {
  private snapshots = new Map<string, GameStateSnapshot>();
  
  /**
   * Crée un snapshot de l'état actuel
   */
  createSnapshot(gameState: any): GameStateSnapshot {
    const snapshot: GameStateSnapshot = {
      tableId: gameState.tableId,
      gameStateId: gameState._id,
      phase: gameState.phase,
      currentPlayerPosition: gameState.currentPlayerPosition,
      currentBet: gameState.currentBet,
      pot: gameState.pot,
      timestamp: Date.now(),
      lockVersion: gameState.lockVersion || 0
    };
    
    this.snapshots.set(gameState.tableId, snapshot);
    return snapshot;
  }
  
  /**
   * Valide qu'un snapshot est toujours valide
   */
  validateSnapshot(
    tableId: string, 
    currentGameState: any
  ): { isValid: boolean; reason?: string } {
    
    const snapshot = this.snapshots.get(tableId);
    if (!snapshot) {
      return { isValid: false, reason: 'No snapshot found' };
    }
    
    // Vérifier la version du verrou
    const currentVersion = currentGameState.lockVersion || 0;
    if (currentVersion !== snapshot.lockVersion) {
      return { 
        isValid: false, 
        reason: `Lock version mismatch: expected ${snapshot.lockVersion}, got ${currentVersion}` 
      };
    }
    
    // Vérifier les champs critiques
    if (currentGameState.currentPlayerPosition !== snapshot.currentPlayerPosition) {
      return { 
        isValid: false, 
        reason: 'Current player position changed' 
      };
    }
    
    if (currentGameState.phase !== snapshot.phase) {
      return { 
        isValid: false, 
        reason: `Phase changed from ${snapshot.phase} to ${currentGameState.phase}` 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Incrémente la version du verrou
   */
  incrementLockVersion(gameState: any): number {
    const newVersion = (gameState.lockVersion || 0) + 1;
    return newVersion;
  }
  
  /**
   * Nettoie les snapshots anciens
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 secondes
    
    for (const [key, snapshot] of this.snapshots.entries()) {
      if (now - snapshot.timestamp > maxAge) {
        this.snapshots.delete(key);
      }
    }
  }
}

/**
 * Wrapper pour exécuter une action avec protection contre les race conditions
 */
export async function executeAtomicAction<T>(
  tableId: string,
  playerId: string,
  actionType: string,
  action: () => Promise<T>,
  lockManager: ActionLockManager,
  versionManager: GameStateVersionManager
): Promise<{ success: boolean; result?: T; error?: string }> {
  
  // 1. Acquérir le verrou
  const lockResult = await lockManager.acquireLock(tableId, playerId, actionType);
  if (!lockResult.success) {
    return { success: false, error: lockResult.error };
  }
  
  const { lockId } = lockResult;
  
  try {
    // 2. Exécuter l'action
    const result = await action();
    
    // 3. Libérer le verrou
    lockManager.releaseLock(tableId, playerId, lockId!);
    
    return { success: true, result };
    
  } catch (error) {
    // 4. Libérer le verrou en cas d'erreur
    lockManager.releaseLock(tableId, playerId, lockId!);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Decorator pour les mutations Convex avec protection race conditions
 */
export function withRaceConditionProtection(
  lockManager: ActionLockManager,
  versionManager: GameStateVersionManager
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(ctx: any, args: any) {
      const { tableId, playerId, actionType = propertyName } = args;
      
      return executeAtomicAction(
        tableId,
        playerId,
        actionType,
        () => method.call(this, ctx, args),
        lockManager,
        versionManager
      );
    };
    
    return descriptor;
  };
}

/**
 * Utilitaire pour timeout automatique des actions
 */
export class ActionTimeoutManager {
  private timeouts = new Map<string, NodeJS.Timeout>();
  
  /**
   * Démarre un timeout pour une action
   */
  startTimeout(
    tableId: string,
    playerId: string,
    timeoutMs: number,
    onTimeout: () => void
  ): void {
    const key = `${tableId}_${playerId}`;
    
    // Nettoyer timeout existant
    this.clearTimeout(key);
    
    // Démarrer nouveau timeout
    const timeout = setTimeout(() => {
      this.timeouts.delete(key);
      onTimeout();
    }, timeoutMs);
    
    this.timeouts.set(key, timeout);
  }
  
  /**
   * Annule un timeout
   */
  clearTimeout(key: string): void {
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }
  
  /**
   * Annule tous les timeouts pour une table
   */
  clearTableTimeouts(tableId: string): void {
    for (const [key, timeout] of this.timeouts.entries()) {
      if (key.startsWith(tableId)) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
      }
    }
  }
  
  /**
   * Nettoie tous les timeouts
   */
  cleanup(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
}

// Instances globales
export const actionLockManager = new ActionLockManager();
export const gameStateVersionManager = new GameStateVersionManager();
export const actionTimeoutManager = new ActionTimeoutManager();

// Nettoyage périodique
setInterval(() => {
  actionLockManager.cleanup();
  gameStateVersionManager.cleanup();
}, 30000); // Toutes les 30 secondes