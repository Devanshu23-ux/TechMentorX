import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

type AppRole = 'admin' | 'teacher' | 'student';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setRole(data.user.role);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    try {
      const { data } = await api.post('/auth/signup', {
        email,
        password,
        fullName,
        role
      });

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setRole(data.user.role);

      return { error: null };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { error: new Error(error.response?.data?.message || 'Signup failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/signin', {
        email,
        password,
      });

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setRole(data.user.role);

      return { error: null };
    } catch (error: any) {
      console.error('Signin error:', error);
      return { error: new Error(error.response?.data?.message || 'Login failed') };
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
    setRole(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
