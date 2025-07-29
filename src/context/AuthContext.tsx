import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

export interface ShopifyCustomer {
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

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: ShopifyCustomer | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<ShopifyCustomer | null>(initialUser ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const router = useRouter();

  useEffect(() => {
    if (initialUser) return; // already have user from SSR

    const hasCustomerSession = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('customer_session='));

    if (!hasCustomerSession) {
      // No session cookie present, skip verifying
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/shopify/verify-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.customer);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [initialUser]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const hasCustomerSession = document.cookie
        .split(';')
        .some((c) => c.trim().startsWith('customer_session='));

      if (hasCustomerSession && initialUser) {
        try {
          const res = await fetch('/api/shopify/verify-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.customer);
            setIsAuthenticated(true);
          }
        } catch {
          // ignore failures
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initialUser]);

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
    <AuthContext.Provider
      value={{ isAuthenticated, user, signIn, signOut, loading, refreshUser }}
    >
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
