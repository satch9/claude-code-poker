import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { UserProfile } from "../Auth/UserProfile";

/**
 * Écran Profil minimal pour l'onglet AppShell.
 * - Identité (avatar initiale + nom + email)
 * - Préférences (placeholder pour Sprint 6+)
 * - Compte (bouton Modifier le profil → ouvre l'ancien dialog UserProfile)
 * - Déconnexion
 */
export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);

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
          <Button variant="secondary" onClick={() => setShowEditDialog(true)}>
            Modifier le profil
          </Button>
          <Button variant="danger" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      </Card>

      {/* Dialog UserProfile complet (legacy, monté à la demande) */}
      {showEditDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowEditDialog(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <UserProfile showLogout={false} />
            <div className="mt-2 text-right">
              <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
