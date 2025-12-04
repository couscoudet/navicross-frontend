import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Navigation, LogOut, User, LayoutDashboard } from "lucide-react";

interface HeaderProps {
  currentPage?: "home" | "admin";
}

export const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo et navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Navigation className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Navicross</h1>
            </Link>

            {/* Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  to="/"
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      currentPage === "home"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  Accueil
                </Link>
                <Link
                  to="/admin"
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    flex items-center gap-2
                    ${
                      currentPage === "admin"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  <LayoutDashboard size={16} />
                  Administration
                </Link>
              </nav>
            )}
          </div>

          {/* User menu */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-gray-700">
                <User size={20} />
                <span className="font-medium">{user.name}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut size={16} />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
