import { createContext, useContext } from 'react';
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { User } from '../../shared/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthState() {
  const { isLoading: convexIsLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser);
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  const isLoading = convexIsLoading || (isAuthenticated && user === undefined);

  const login = () => {
    // Cette fonction sera appelée par le composant de connexion
    // L'authentification sera gérée par Convex Auth
    window.location.href = "/auth/signin";
  };

  const logout = () => {
    // Cette fonction sera appelée par le composant de déconnexion
    window.location.href = "/auth/signout";
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user || !isAuthenticated) return;
    
    try {
      await createOrUpdateUser({
        email: user.email,
        name: updates.name || user.name,
        avatar: updates.avatar || user.avatar,
      });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };
}

export { AuthContext };