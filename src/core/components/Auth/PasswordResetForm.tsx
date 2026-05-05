import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const PasswordResetForm: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const reset = useAction(api.passwordReset.resetPassword);
  const [pwd, setPwd] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
          <p className="text-gray-600 mb-4">Ce lien de réinitialisation est invalide.</p>
          <a href="/" className="text-blue-600 hover:underline">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Mot de passe réinitialisé</h2>
          <p className="text-gray-600 mb-4">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <a href="/" className="text-blue-600 hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await reset({ token, newPassword: pwd });
      setDone(true);
    } catch (e: any) {
      const raw = e?.message || String(e);
      const m = raw.match(/Validation:.+|Invalid or expired token/);
      setErr(m ? m[0] : raw);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green-800 to-poker-green-900 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-4"
      >
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Nouveau mot de passe
        </h2>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="≥12 caractères, ou 8+ avec maj+chiffre+spécial"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          minLength={8}
        />
        {err && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md disabled:opacity-50"
        >
          {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
        </button>
      </form>
    </div>
  );
};
