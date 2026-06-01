import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const AUTH_TOKEN_KEY = "portoSeguraToken";
const AUTH_USER_KEY = "portoSeguraUser";

export type AuthUser = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  bio: string;
  estado: string;
  cidade: string;
  urlLinkedin?: string | null;
  urlInstagram?: string | null;
  urlFacebook?: string | null;
  roles: string[];
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  login: (token: string, user?: AuthUser | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
        setUser(null);
      }
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      ready,
      isAuthenticated: Boolean(token),
      login: (newToken: string, newUser: AuthUser | null = null) => {
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        if (newUser) {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
        } else {
          localStorage.removeItem(AUTH_USER_KEY);
        }
        setToken(newToken);
        setUser(newUser);
      },
      logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [ready, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && !auth.isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [auth.isAuthenticated, auth.ready, navigate]);

  return auth;
}

export const AUTH_STORAGE_KEY = AUTH_TOKEN_KEY;