import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Navigation } from "lucide-react";

type Tab = "login" | "register";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("login");

  const handleSuccess = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-lg mb-4">
            <Navigation className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Navicross</h1>
          <p className="text-gray-600 mt-2">
            Navigation intelligente pour événements sportifs
          </p>
        </div>

        {/* Card avec formulaires */}
        <div className="bg-white rounded-lg shadow-card p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("login")}
              className={`
                flex-1 py-2 px-4 rounded font-medium transition-all duration-fast
                ${
                  activeTab === "login"
                    ? "bg-white text-primary shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              Connexion
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`
                flex-1 py-2 px-4 rounded font-medium transition-all duration-fast
                ${
                  activeTab === "register"
                    ? "bg-white text-primary shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              Inscription
            </button>
          </div>

          {/* Formulaires */}
          <div className="fade-in">
            {activeTab === "login" ? (
              <LoginForm onSuccess={handleSuccess} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          En vous connectant, vous acceptez nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
};
