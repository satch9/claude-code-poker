import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../UI/Button';
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
      // Anti-enumeration : on signale toujours "envoyé" même en cas d'échec
      // (côté serveur on retourne ok pour les emails inconnus, ici fallback
      // pour erreurs réseau).
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

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Créer un compte' : 'Se connecter'}
          </h2>
          <p className="text-gray-600">
            {isSignUp ? 'Rejoignez la partie' : 'Connectez-vous pour jouer'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Chargement...' : isSignUp ? 'Créer le compte' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
          </button>

          {!isSignUp && (
            <div>
              <button
                type="button"
                onClick={() => { setShowForgot(!showForgot); setForgotSent(false); }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {showForgot && !isSignUp && (
            <div className="mt-2 p-3 bg-gray-50 rounded">
              {forgotSent ? (
                <p className="text-sm text-gray-700">
                  Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.
                </p>
              ) : (
                <form onSubmit={handleForgot} className="space-y-2">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Votre email"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm"
                  >
                    Envoyer le lien
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Les chips sont gérées par table, pas par utilisateur
          </p>
        </div>
      </div>
    </div>
  );
};