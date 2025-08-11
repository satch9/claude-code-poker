// Gestionnaire amélioré des timeouts pour éviter les fuites mémoire
export class TimeoutManager {
  private timeouts = new Map<string, NodeJS.Timeout>();
  
  /**
   * Démarre un timeout avec nettoyage automatique
   */
  setTimeout(
    key: string,
    callback: () => void,
    delay: number
  ): void {
    // Nettoyer timeout existant si présent
    this.clearTimeout(key);
    
    // Créer nouveau timeout
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(key);
      callback();
    }, delay);
    
    this.timeouts.set(key, timeoutId);
  }
  
  /**
   * Annule un timeout spécifique
   */
  clearTimeout(key: string): boolean {
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
      return true;
    }
    return false;
  }
  
  /**
   * Annule tous les timeouts avec un préfixe
   */
  clearTimeoutsWithPrefix(prefix: string): number {
    let cleared = 0;
    for (const [key, timeoutId] of this.timeouts.entries()) {
      if (key.startsWith(prefix)) {
        clearTimeout(timeoutId);
        this.timeouts.delete(key);
        cleared++;
      }
    }
    return cleared;
  }
  
  /**
   * Annule tous les timeouts
   */
  clearAllTimeouts(): number {
    const count = this.timeouts.size;
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
    return count;
  }
  
  /**
   * Obtient le nombre de timeouts actifs
   */
  getActiveCount(): number {
    return this.timeouts.size;
  }
  
  /**
   * Obtient les clés des timeouts actifs
   */
  getActiveKeys(): string[] {
    return Array.from(this.timeouts.keys());
  }
  
  /**
   * Vérifie si un timeout existe
   */
  hasTimeout(key: string): boolean {
    return this.timeouts.has(key);
  }
}

/**
 * Hook pour utiliser TimeoutManager avec cleanup automatique
 */
import { useEffect, useRef } from 'react';

export const useTimeoutManager = () => {
  const timeoutManager = useRef(new TimeoutManager());
  
  // Cleanup automatique au démontage
  useEffect(() => {
    return () => {
      const cleared = timeoutManager.current.clearAllTimeouts();
      if (cleared > 0) {
        console.log(`Cleaned up ${cleared} timeouts on component unmount`);
      }
    };
  }, []);
  
  return timeoutManager.current;
};

/**
 * Types pour les timeouts de jeu
 */
export interface GameTimeoutConfig {
  playerActionTimeout: number;    // 30 secondes
  autoAdvanceDelay: number;       // 100ms buffer
  phaseTransitionDelay: number;   // 2 secondes entre phases
  showdownDelay: number;          // 5 secondes pour voir résultats
}

export const DEFAULT_GAME_TIMEOUTS: GameTimeoutConfig = {
  playerActionTimeout: 30000,     // 30s
  autoAdvanceDelay: 100,          // 100ms
  phaseTransitionDelay: 2000,     // 2s
  showdownDelay: 5000,            // 5s
};

/**
 * Gestionnaire spécialisé pour les timeouts de poker
 */
export class PokerTimeoutManager extends TimeoutManager {
  private readonly config: GameTimeoutConfig;
  
  constructor(config: GameTimeoutConfig = DEFAULT_GAME_TIMEOUTS) {
    super();
    this.config = config;
  }
  
  /**
   * Démarre un timeout d'action pour un joueur
   */
  startPlayerActionTimeout(
    playerId: string,
    tableId: string,
    onTimeout: () => void
  ): void {
    const key = `player_action_${tableId}_${playerId}`;
    this.setTimeout(key, onTimeout, this.config.playerActionTimeout);
  }
  
  /**
   * Annule le timeout d'action d'un joueur
   */
  clearPlayerActionTimeout(playerId: string, tableId: string): boolean {
    const key = `player_action_${tableId}_${playerId}`;
    return this.clearTimeout(key);
  }
  
  /**
   * Démarre un timeout d'avancement automatique
   */
  startAutoAdvanceTimeout(
    tableId: string,
    phase: string,
    delay: number,
    onTimeout: () => void
  ): void {
    const key = `auto_advance_${tableId}_${phase}`;
    const totalDelay = delay + this.config.autoAdvanceDelay;
    this.setTimeout(key, onTimeout, totalDelay);
  }
  
  /**
   * Annule tous les timeouts d'une table
   */
  clearTableTimeouts(tableId: string): number {
    return this.clearTimeoutsWithPrefix(`${tableId}_`) + 
           this.clearTimeoutsWithPrefix(`auto_advance_${tableId}_`) +
           this.clearTimeoutsWithPrefix(`player_action_${tableId}_`);
  }
  
  /**
   * Démarre un timeout de transition de phase
   */
  startPhaseTransitionTimeout(
    tableId: string,
    fromPhase: string,
    toPhase: string,
    onTimeout: () => void
  ): void {
    const key = `phase_transition_${tableId}_${fromPhase}_to_${toPhase}`;
    this.setTimeout(key, onTimeout, this.config.phaseTransitionDelay);
  }
  
  /**
   * Démarre un timeout pour l'affichage du showdown
   */
  startShowdownTimeout(
    tableId: string,
    onTimeout: () => void
  ): void {
    const key = `showdown_display_${tableId}`;
    this.setTimeout(key, onTimeout, this.config.showdownDelay);
  }
}