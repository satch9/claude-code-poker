import { Doc, Id } from "../_generated/dataModel";

/**
 * Filtre les cartes privées d'un joueur si l'appelant n'en est pas le propriétaire.
 * Résout C4.3 : exposition des cartes adverses.
 */
export function sanitizePlayer(
  player: Doc<"players">,
  callerId: Id<"users"> | null,
) {
  if (!callerId || player.userId !== callerId) {
    return { ...player, cards: [] as string[] };
  }
  return player;
}

/**
 * Supprime `remainingDeck` du payload public.
 * Résout C4.4 : deck restant prédictible exposé au client.
 */
export function sanitizeGameState(state: Doc<"gameStates"> | null) {
  if (!state) return null;
  const { remainingDeck: _omit, ...rest } = state as Doc<"gameStates"> & {
    remainingDeck?: unknown;
  };
  return rest;
}
