import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { User } from '../../shared/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
  login: () => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Auth state hook backed by `@convex-dev/auth`.
 *
 * The user document is sourced from the `auth.loggedInUser` query, which
 * reads `getAuthUserId(ctx)` server-side. Sessions are HTTP-only tokens
 * managed by `ConvexAuthProvider`.
 */
export function useAuthState(): AuthContextType {
  const { signIn: signInAction, signOut: signOutAction } = useAuthActions();
  const userDoc = useQuery(api.auth.loggedInUser);
  const [error, setError] = useState<string | null>(null);
  // localUser holds optimistic name/avatar updates between mutation and re-query
  const [localOverrides, setLocalOverrides] = useState<Partial<User>>({});

  // user === undefined while query is loading; null when unauthenticated
  const isLoading = userDoc === undefined;
  const isAuthenticated = userDoc !== null && userDoc !== undefined;

  // Mémoïsé pour que l'identité de `user` ne change pas à chaque render
  // (sinon les useEffect / useCallback qui en dépendent se ré-initialisent
  // à l'infini — typique : le timer 30s d'auto-fold qui ne fire jamais).
  const user: User | null = useMemo(
    () =>
      userDoc
        ? ({ ...(userDoc as any), ...localOverrides } as User)
        : null,
    [userDoc, localOverrides]
  );

  const clearError = useCallback(() => setError(null), []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      setError(null);
      try {
        const result = await signInAction("password", {
          email,
          password,
          name,
          flow: "signUp",
        });
        return result;
      } catch (e: any) {
        const msg = extractErrorMessage(e);
        setError(msg);
        throw e;
      }
    },
    [signInAction]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const result = await signInAction("password", {
          email,
          password,
          flow: "signIn",
        });
        return result;
      } catch (e: any) {
        const msg = extractErrorMessage(e);
        setError(msg);
        throw e;
      }
    },
    [signInAction]
  );

  const logout = useCallback(async () => {
    setError(null);
    setLocalOverrides({});
    try {
      await signOutAction();
    } catch (e) {
      console.warn("signOut failed", e);
    }
  }, [signOutAction]);

  const login = useCallback(() => {
    // Legacy no-op kept for backwards compatibility.
    // Sign-in is performed via the EmailPasswordForm calling `signIn()`.
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setLocalOverrides((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    clearError,
    login,
    logout,
    updateUser,
    signUp,
    signIn,
  };
}

function extractErrorMessage(e: unknown): string {
  if (!e) return 'Erreur inconnue';
  if (typeof e === 'string') return e;
  if (e instanceof Error) {
    const m = e.message.match(
      /Validation:.+|Invalid email or password|InvalidAccountId|InvalidSecret|User already exists.+|Mot de passe.+/
    );
    return m ? m[0] : e.message;
  }
  return String(e);
}

export { AuthContext };
