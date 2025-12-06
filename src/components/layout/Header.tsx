import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Navigation, LogOut, User, LayoutDashboard, Home, Menu, X } from "lucide-react";

interface HeaderProps {
  currentPage?: "home" | "admin";
}

export const Header: React.FC<HeaderProps> = ({ currentPage }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm mb-6 relative z-50">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              onClick={handleNavClick}
              className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-primary rounded-lg">
                <Navigation className="text-white" size={20} />
              </div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Navicross</h1>
            </Link>

            {/* Navigation Desktop - visible pour tous */}
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/"
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  flex items-center gap-2
                  ${
                    currentPage === "home"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                <Home size={16} />
                Événements
              </Link>

              {isAuthenticated && (
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
              )}
            </nav>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 text-gray-700">
                    <User size={20} />
                    <span className="font-medium">{user?.name}</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    <LogOut size={16} />
                    Déconnexion
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/login")}
                >
                  Connexion admin
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X size={24} className="text-gray-700" />
              ) : (
                <Menu size={24} className="text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[280px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                <Navigation className="text-white" size={18} />
              </div>
              <span className="font-bold text-gray-900">Menu</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <X size={20} className="text-gray-700" />
            </button>
          </div>

          {/* Mobile Menu Content */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* User Info */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-full">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <Link
                to="/"
                onClick={handleNavClick}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${
                    currentPage === "home"
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  }
                `}
              >
                <Home size={20} />
                Événements
              </Link>

              {isAuthenticated && (
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                    ${
                      currentPage === "admin"
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                    }
                  `}
                >
                  <LayoutDashboard size={20} />
                  Administration
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile Menu Footer */}
          <div className="p-4 border-t border-gray-200">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            ) : (
              <button
                onClick={() => {
                  navigate("/login");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
              >
                Connexion admin
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
