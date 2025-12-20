import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import { api, getErrorMessage, setUnauthorizedCallback } from "@/services/api";
import type { User, RegisterDto, LoginDto } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionExpired: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [sessionExpired, setSessionExpired] = useState(false);

  // ✅ Logout avec délai pour toast
  const clearSession = useCallback(() => {
    console.log("🔴 Clearing session...");

    // ✅ Bloquer l'UI avec spinner
    setSessionExpired(true);

    // ✅ Toast visible
    toast.error("Votre session a expiré. Reconnexion requise.", {
      duration: 3000,
      position: "top-center",
    });

    // ✅ Nettoyage état
    setUser(null);
    setStoredUser(null);

    // ✅ Redirection après 3s
    setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
  }, []);

  // ✅ Enregistrer le callback AVANT le boot check
  useEffect(() => {
    console.log("📌 Registering unauthorized callback");
    setUnauthorizedCallback(clearSession);
  }, [clearSession]);

  // ✅ Au boot : vérifier que la session backend est valide
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = getStoredUser();

      if (!storedUser) {
        setLoading(false);
        return;
      }

      try {
        const session = await api.auth.checkSession();
        if (session?.user) {
          console.log("✅ Session valide:", session.user);
          setUser(session.user);
          setStoredUser(session.user);
        } else {
          console.warn("⚠️ Session invalide (no user in response)");
          clearSession();
        }
      } catch (error) {
        console.error("❌ Session check failed:", error);
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [clearSession]);

  const register = async (data: RegisterDto) => {
    try {
      const response = await api.auth.register(data);
      setUser(response.user);
      setStoredUser(response.user);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const login = async (data: LoginDto) => {
    try {
      const response = await api.auth.login(data);
      setUser(response.user);
      setStoredUser(response.user);
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
      window.location.href = "/login";
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    sessionExpired,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* ✅ Overlay spinner quand session expirée */}
      {sessionExpired && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-red-600"></div>
            <p className="text-lg font-semibold text-gray-900">
              Session expirée
            </p>
            <p className="text-sm text-gray-600 text-center">
              Redirection vers la page de connexion...
            </p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
