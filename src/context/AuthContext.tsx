import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/router';
import { COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/cookies';

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

  const verifySession = async (): Promise<boolean> => {
    const hasCookie = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

    if (!hasCookie) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }

    try {
      const res = await fetch('/api/shopify/verify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.customer);
        setIsAuthenticated(true);
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    if (initialUser) {
      setLoading(false);
      return;
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifySession().finally(() => setLoading(false));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [initialUser]);


  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/shopify/sign-in-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);

        const domain =
          process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || window.location.hostname;
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
          data.accessToken,
        )}; Domain=${domain}; Path=/; Secure; SameSite=None; Max-Age=${COOKIE_MAX_AGE}`;

        // Fetch user data
        const userResponse = await fetch('/api/shopify/get-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.customer);
        }

        // Verify session after sign in
        const verified = await verifySession();
        if (verified) {
          return { success: true };
        }
        return { success: false, error: 'Session verification failed' };
      } else {
        return { success: false, error: data.error || 'Sign in failed' };
      }
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const signOut = async () => {
    await fetch('/api/shopify/logout', { method: 'POST', credentials: 'include' });

    const domain =
      process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || window.location.hostname;
    document.cookie = `${COOKIE_NAME}=; Domain=${domain}; Path=/; Secure; SameSite=None; Max-Age=0`;

    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/shopify/get-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
