import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatAuthError } from "../../../shared/utils/authErrors";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Card } from "../../../shared/ui/Card";

export const PasswordResetForm: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const reset = useAction(api.passwordReset.resetPassword);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Lien invalide</h1>
          <p className="text-sm text-text-muted">
            Le lien de réinitialisation est manquant ou incorrect.
          </p>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Mot de passe réinitialisé</h1>
          <p className="text-sm text-text-muted mb-4">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <a href="/" className="text-accent hover:underline">
            Se connecter
          </a>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== confirm) {
      setErr("Les mots de passe ne correspondent pas.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      await reset({ token, newPassword: pwd });
      setDone(true);
    } catch (e: unknown) {
      setErr(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <Card variant="elevated" className="w-full max-w-md">
        <h1 className="text-xl font-bold text-text-primary mb-4">
          Nouveau mot de passe
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            label="Nouveau mot de passe"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="≥12 caractères, ou 8+ avec maj+chiffre+spécial"
            required
            minLength={8}
          />
          <Input
            type="password"
            label="Confirmer le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            error={err ?? undefined}
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            Réinitialiser le mot de passe
          </Button>
        </form>
      </Card>
    </div>
  );
};
