import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { LayoutDashboard, MapPin, Route } from "lucide-react";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="home" />

      <main className="container-custom py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <MapPin className="text-primary" size={40} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Bienvenue sur Navicross
            </h1>
            <p className="text-lg text-gray-600">
              Plateforme de navigation intelligente pour événements sportifs
            </p>
          </div>

          {/* Fonctionnalités */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Pour les organisateurs */}
            <div className="bg-white rounded-lg shadow-card p-8 hover:shadow-card-hover transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <LayoutDashboard className="text-primary" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Pour les organisateurs
              </h2>
              <p className="text-gray-600 mb-6">
                Créez vos événements et définissez les zones fermées à la
                circulation. Gérez facilement les barrages, tronçons et zones
                interdites.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate("/admin")}
                fullWidth
              >
                <LayoutDashboard size={20} />
                Accéder à l'administration
              </Button>
            </div>

            {/* Pour les spectateurs */}
            <div className="bg-white rounded-lg shadow-card p-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                <Route className="text-success" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Pour les spectateurs
              </h2>
              <p className="text-gray-600 mb-6">
                Calculez votre itinéraire en évitant automatiquement les zones
                fermées. Arrivez à destination sans encombre le jour de
                l'événement.
              </p>
              <Button variant="secondary" fullWidth disabled>
                <Route size={20} />
                Navigation (bientôt)
              </Button>
            </div>
          </div>

          {/* Statut du projet */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              📍 Progression du projet
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <span>Étape 1 : Authentification complète</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">🔵</span>
                <span className="font-semibold">
                  Étape 2 : Gestion des événements (en cours)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⚪</span>
                <span className="text-gray-600">
                  Étape 3 : Carte et closures (à venir)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⚪</span>
                <span className="text-gray-600">
                  Étape 4 : Navigation spectateurs (à venir)
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
