import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../../shared/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, name: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate Convex authentication - in real app, this would use Convex auth
  useEffect(() => {
    const storedUser = localStorage.getItem('poker-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('poker-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, name: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app, this would call Convex createUser mutation
      const newUser: User = {
        _id: `user_${Date.now()}` as any, // Mock ID
        email,
        name,
        chips: 10000, // Starting chips
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
      
      setUser(newUser);
      localStorage.setItem('poker-user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to login');
    } finally {
      setIsLoading(false);
    }
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
    login,
    logout,
    updateUser,
  };
}

export { AuthContext };