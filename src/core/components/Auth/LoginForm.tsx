import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { EmailPasswordForm } from "./EmailPasswordForm";
import { Card } from "../../../shared/ui/Card";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <div className="text-center p-4">
            <div className="animate-spin text-2xl" aria-hidden>⏳</div>
            <p className="mt-2 text-text-muted">Chargement...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    onSuccess?.();
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Bienvenue sur Poker Famille
          </h1>
          <p className="text-text-muted text-sm">
            Connectez-vous avec votre email
          </p>
        </div>

        <div className="space-y-4">
          <EmailPasswordForm onSuccess={onSuccess} />
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Vos jetons seront attribués{" "}
          <span className="font-semibold text-sem-success">à chaque table</span>{" "}
          selon les règles du jeu.
        </p>
      </Card>
    </div>
  );
};
