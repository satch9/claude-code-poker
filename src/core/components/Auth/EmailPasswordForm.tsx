import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { api } from '../../../../convex/_generated/api';
import { formatAuthError } from '../../../shared/utils/authErrors';

interface EmailPasswordFormProps {
  onSuccess?: () => void;
}

export const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);

  const { signUp, signIn } = useAuth();

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordReset({ email: forgotEmail.trim().toLowerCase() });
      setForgotSent(true);
    } catch (_err) {
      // Anti-enumeration : on signale toujours "envoyé"
      setForgotSent(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <form onSubmit={handleForgot} className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Mot de passe oublié
          </h3>
          <p className="text-sm text-text-muted">
            Saisis ton email, nous t'enverrons un lien de réinitialisation.
          </p>
        </div>
        <Input
          type="email"
          label="Email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          required
        />
        {forgotSent && (
          <p className="text-sm text-sem-success">
            Si un compte existe pour cette adresse, un email a été envoyé.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowForgot(false);
              setForgotSent(false);
              setForgotEmail('');
            }}
            className="flex-1"
          >
            Retour
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={forgotSent}>
            Envoyer
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        id="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {isSignUp && (
        <Input
          id="name"
          type="text"
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      )}

      <Input
        id="password"
        type="password"
        label="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        error={error || undefined}
      />

      <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={loading}>
        {isSignUp ? "S'inscrire" : 'Se connecter'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setIsSignUp((v) => !v)}
          className="text-accent hover:underline"
        >
          {isSignUp ? 'Déjà un compte ?' : 'Créer un compte'}
        </button>
        {!isSignUp && (
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-text-muted hover:text-text-primary"
          >
            Mot de passe oublié ?
          </button>
        )}
      </div>
    </form>
  );
};
