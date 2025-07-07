import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SignInButtonProps {
  provider?: 'google' | 'github';
  className?: string;
}

export const SignInButton: React.FC<SignInButtonProps> = ({ 
  provider = 'google', 
  className = '' 
}) => {
  const { login, isLoading } = useAuth();

  const handleSignIn = () => {
    // Redirection vers la page d'authentification Convex
    window.location.href = `/auth/${provider}`;
  };

  const providerNames = {
    google: 'Google',
    github: 'GitHub'
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 
        bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
        text-white font-medium rounded-lg transition-colors
        ${className}
      `}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        <>
          <span>Se connecter avec {providerNames[provider]}</span>
        </>
      )}
    </button>
  );
};