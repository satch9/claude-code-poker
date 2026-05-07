import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { UserProfile } from "../Auth/UserProfile";

/**
 * Écran Profil pour l'onglet AppShell.
 * - Identité (avatar initiale + nom + email)
 * - Préférences (placeholder pour itération future)
 * - Compte : <UserProfile compact /> qui ouvre son propre dialog (avatar
 *   selector + édition nom + image upload). On le rend tel quel — la
 *   refonte profonde du dialog legacy reste à faire (UserProfile
 *   compact branch fait 318 lignes, hors scope Sprint 5).
 * - Déconnexion (bouton dédié dark Sprint 0).
 */
export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initial = (user.name || "?").charAt(0).toUpperCase();

  return (
    <div className="container mx-auto max-w-2xl px-3 md:px-4 py-4 md:py-6 space-y-4">
      {/* Identité */}
      <Card variant="elevated">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-text-primary truncate">
              {user.name}
            </h1>
            <p className="text-sm text-text-muted truncate">{user.email}</p>
          </div>
        </div>
      </Card>

      {/* Préférences (placeholder) */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-2">
          Préférences
        </h2>
        <p className="text-sm text-text-muted">
          Le réglage du thème, des notifications, animations et sons arrive
          dans une itération future.
        </p>
      </Card>

      {/* Compte */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          Compte
        </h2>
        <div className="flex flex-col gap-2">
          {/* UserProfile compact : bouton qui ouvre un dialog legacy avec
              édition complète (avatar, nom, image upload). Dialog encore
              en theme light — refonte profonde laissée pour itération.
              showLogout={false} : on évite le doublon, le bouton de
              déconnexion juste en dessous suffit. */}
          <UserProfile compact showLogout={false} />
          <Button variant="danger" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
};
