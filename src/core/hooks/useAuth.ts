import { createContext, useContext, useState, useEffect } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { User } from '../../shared/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
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

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const signUpMutation = useMutation(api.auth.signUpWithPassword);
  const signInMutation = useMutation(api.auth.signInWithPassword);
  
  // Query to get full user data from database
  // Only call if we have a valid user ID that doesn't come from notifications table
  const isValidUserId = user && user._id && 
    typeof user._id === 'string' && 
    user._id.length > 20 && 
    !user._id.includes('notification') &&
    user._id !== 'jd7514rayy58sj0twv09h2fk0h7h1pn1'; // Block the specific problematic ID
    
  const userQuery = useQuery(
    api.users.getUser,
    isValidUserId ? { userId: user._id } : "skip"
  );

  // Charger l'utilisateur depuis localStorage au démarrage
  useEffect(() => {
    const storedUser = localStorage.getItem('poker-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate that the user ID looks correct (not a notification ID)
        if (parsedUser._id && 
            parsedUser._id.length > 20 && 
            !parsedUser._id.includes('notification') &&
            parsedUser._id !== 'jd7514rayy58sj0twv09h2fk0h7h1pn1') {
          setUser(parsedUser);
        } else {
          console.error('Invalid user ID found in localStorage:', parsedUser._id);
          localStorage.removeItem('poker-user');
          // Also clear any other stored data that might be corrupted
          localStorage.clear();
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('poker-user');
      }
    }
    setIsLoading(false);
  }, []);

  // Additional effect to clean up bad user data
  useEffect(() => {
    if (user && user._id === 'jd7514rayy58sj0twv09h2fk0h7h1pn1') {
      console.error('Detected problematic user ID, clearing user data');
      setUser(null);
      localStorage.clear();
    }
  }, [user]);

  // Sync user data with database when userQuery updates
  useEffect(() => {
    if (userQuery && user && userQuery._id === user._id) {
      // Only update if there are actual changes to avoid infinite loop
      const hasChanges = 
        userQuery.name !== user.name ||
        userQuery.avatarColor !== user.avatarColor ||
        userQuery.avatarImageId !== user.avatarImageId ||
        userQuery.email !== user.email;
      
      if (hasChanges) {
        const updatedUser = { ...userQuery } as User;
        setUser(updatedUser);
        localStorage.setItem('poker-user', JSON.stringify(updatedUser));
      }
    }
  }, [userQuery, user?._id, user?.name, user?.avatarColor, user?.avatarImageId, user?.email]);

  const isAuthenticated = user !== null;

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const result = await signUpMutation({ email, password, name });
      const newUser: User = {
        _id: result.userId,
        email,
        name,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
      setUser(newUser);
      localStorage.setItem('poker-user', JSON.stringify(newUser));
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signInMutation({ email, password });
      // Use the full user data returned from the backend
      if (result.user) {
        const userData = result.user as User;
        setUser(userData);
        localStorage.setItem('poker-user', JSON.stringify(userData));
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    console.log('Login called - handled by form components');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('poker-user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('poker-user', JSON.stringify(updatedUser));
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    signUp,
    signIn,
  };
}

export { AuthContext };