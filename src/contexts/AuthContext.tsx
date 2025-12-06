import React, { createContext, useContext, useState, useEffect } from "react";
import { api, getErrorMessage } from "@/services/api";
import type { User, RegisterDto, LoginDto } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper pour le localStorage (user info uniquement)
// Le cookie session_id est maintenant géré par le serveur via Set-Cookie
const USER_STORAGE_KEY = "navicross_user";

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, récupérer l'utilisateur du localStorage
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const register = async (data: RegisterDto) => {
    try {
      const response = await api.auth.register(data);
      setUser(response.user);
      setStoredUser(response.user);
      // Le cookie session_id est défini automatiquement par le serveur via Set-Cookie
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const login = async (data: LoginDto) => {
    try {
      const response = await api.auth.login(data);
      setUser(response.user);
      setStoredUser(response.user);
      // Le cookie session_id est défini automatiquement par le serveur via Set-Cookie
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setStoredUser(null);
      // Le cookie session_id est supprimé automatiquement par le serveur
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
