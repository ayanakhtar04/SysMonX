import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'sysmonx_auth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { isAuthenticated: boolean; userEmail: string | null };
        if (parsed.isAuthenticated && parsed.userEmail) {
          setIsAuthenticated(true);
          setUserEmail(parsed.userEmail);
        }
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const login = (email: string): void => {
    setIsAuthenticated(true);
    setUserEmail(email);
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ isAuthenticated: true, userEmail: email }),
    );
  };

  const logout = (): void => {
    setIsAuthenticated(false);
    setUserEmail(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value: AuthContextValue = useMemo(
    () => ({ isAuthenticated, userEmail, login, logout }),
    [isAuthenticated, userEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
