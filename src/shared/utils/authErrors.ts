/**
 * Traduit les erreurs serveur (ConvexError ou Error) en messages français
 * destinés à l'utilisateur final. Les détails techniques (Request ID, stack,
 * chemins de fichiers) sont éliminés.
 */
export function formatAuthError(err: unknown): string {
  const raw = (err as { message?: string })?.message
    ?? String(err ?? '')
    ?? '';

  // Extraction du message ConvexError s'il est dans la stack
  const cvx = raw.match(/ConvexError:\s*([^\n]+?)(?:\s*at\s+handler|$)/);
  const core = (cvx ? cvx[1] : raw).trim();

  // Mappings sémantiques → français
  if (/Locked:.*sign-in/i.test(core) || /too many sign-in/i.test(core)) {
    return 'Trop de tentatives. Réessayez dans 15 minutes.';
  }
  if (/RateLimited/i.test(core)) {
    return 'Trop de requêtes. Réessayez dans quelques instants.';
  }
  if (/InvalidAccountId|Invalid email or password|Invalid password/i.test(core)) {
    return 'Email ou mot de passe incorrect.';
  }
  if (/User already exists|already registered|already an account/i.test(core)) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (/Invalid email format|Email/i.test(core) && /invalid|format/i.test(core)) {
    return 'Format d\'email invalide.';
  }
  if (/Password must be|password.*at least|password.*entropy/i.test(core)) {
    return 'Mot de passe trop faible : min. 12 caractères, ou 8 caractères avec majuscule, chiffre et caractère spécial.';
  }
  if (/Unauthorized:/i.test(core)) {
    return 'Action non autorisée.';
  }
  if (/Invalid or expired token/i.test(core)) {
    return 'Lien expiré ou invalide. Demandez un nouveau lien.';
  }
  if (/TLD too short/i.test(core)) {
    return 'Adresse email invalide.';
  }

  // Fallback : message générique en français
  return 'Une erreur est survenue. Veuillez réessayer.';
}
