import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/router';
import { COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/cookies';

const STORAGE_KEY = 'auricle-auth-user';

type Debounced<T extends (...args: unknown[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void;
};

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): Debounced<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  defaultAddress?: {
    country?: string;
    [key: string]: unknown;
  };
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

function getInitialAuth(initialUser?: ShopifyCustomer | null) {
  if (initialUser) {
    return { user: initialUser, isAuthenticated: true };
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { user: JSON.parse(stored) as ShopifyCustomer, isAuthenticated: true };
      }
    } catch {
      // ignore parse errors
    }

    const hasCookie = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

    if (hasCookie) {
      return { user: null, isAuthenticated: true };
    }
  }

  return { user: null, isAuthenticated: false };
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const { user: initialStateUser, isAuthenticated: initialAuth } =
    getInitialAuth(initialUser);
  const [user, setUser] = useState<ShopifyCustomer | null>(initialStateUser);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [loading] = useState(false);
  const router = useRouter();

  const verifySession = async (): Promise<boolean> => {
    const hasCookie = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

    if (!hasCookie) {
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.customer));
        }
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      return false;
    }
  };

  useEffect(() => {
    verifySession();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId === null) {
        intervalId = setInterval(verifySession, 60_000);
      }
    };

    const stopInterval = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (document.visibilityState === 'visible') {
      startInterval();
    }

    const debouncedVerifySession = debounce(verifySession, 1_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debouncedVerifySession();
        startInterval();
      } else {
        debouncedVerifySession.cancel();
        stopInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      debouncedVerifySession.cancel();
    };
  }, []);


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
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(userData.customer),
            );
          }
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.customer));
        }
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
