import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { SignInButton } from "./SignInButton";
import { EmailPasswordForm } from "./EmailPasswordForm";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin text-2xl">⏳</div>
            <p className="mt-2 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    onSuccess?.();
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue sur Poker Famille
          </h1>
          <p className="text-gray-600">
            Choisissez votre méthode de connexion
          </p>
        </div>

        <div className="space-y-4">
          <SignInButton 
            provider="google"
            className="w-full"
          />
          
          <SignInButton 
            provider="github"
            className="w-full"
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>
          
          <EmailPasswordForm onSuccess={onSuccess} />
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Vos chips seront attribués{" "}
            <span className="font-semibold text-poker-green-600">
            à chaque table
            </span>{" "}
            selon les règles du jeu
          </p>
        </div>
      </div>
    </div>
  );
};
