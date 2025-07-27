import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface ShopifyCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: ShopifyCustomer | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialHeaders =
    typeof window !== 'undefined'
      ? (window as any)?.__NEXT_DATA__?.props?.headers
      : undefined;

  const headerAuthenticated = initialHeaders?.['x-customer-authenticated'] === 'true';
  const headerEmail = initialHeaders?.['x-customer-email'];

  const [isAuthenticated, setIsAuthenticated] = useState(headerAuthenticated);
  const [user, setUser] = useState<ShopifyCustomer | null>(
    headerAuthenticated && headerEmail ? { email: headerEmail, id: '' } : null
  );
  const [loading, setLoading] = useState(!headerAuthenticated);
  const router = useRouter();

  // Check authentication status on mount when headers are missing
  useEffect(() => {
    if (headerAuthenticated) {
      // state already populated from headers
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/shopify/verify-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.customer);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [headerAuthenticated]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/shopify/sign-in-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);

        // Fetch user data
        const userResponse = await fetch('/api/shopify/get-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.customer);
        }

        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign in failed' };
      }
    } catch {
  return { success: false, error: 'Network error' };
}
  };

  const signOut = async () => {
    await fetch('/api/shopify/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
  };
const refreshUser = async () => {

  try {
    const res = await fetch('/api/shopify/get-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.customer);
    }
  } catch (err) {
    console.error('Failed to refresh user:', err);
  }
};

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, signIn, signOut, loading, refreshUser, }}>
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