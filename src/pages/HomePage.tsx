import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Navigation, Lock, Search, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { fuzzySearch } from "@/utils/search-utils";
import type { Event } from "@/types";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: api.events.getAll,
  });

  // Filtrer et rechercher
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Par défaut: événements du jour et des 10 prochains jours
    if (!startDate && !endDate && !searchQuery) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in10Days = new Date(today);
      in10Days.setDate(in10Days.getDate() + 10);

      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.event_date);
        return eventDate >= today && eventDate <= in10Days;
      });
    }

    // Recherche par nom (fuzzy)
    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          fuzzySearch(searchQuery, event.name, 0.5) ||
          (event.description &&
            fuzzySearch(searchQuery, event.description, 0.5))
      );
    }

    // Filtrage par dates
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(
        (event) => new Date(event.event_date) >= start
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((event) => new Date(event.event_date) <= end);
    }

    // Trier par date
    return filtered.sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [events, searchQuery, startDate, endDate]);

  const hasActiveFilters = searchQuery || startDate || endDate;

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="home" />

      <main className="container-custom py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Navigation intelligente lors d'événements
          </h1>
          <p className="text-gray-600">
            Calculez votre itinéraire en évitant les fermetures de routes
            pendant les événements sportifs
          </p>
          {!isAuthenticated && (
            <button
              onClick={() => navigate("/login")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              <Lock size={16} />
              Connexion administrateur
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Recherche par nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un événement
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom de l'événement..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Date début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                À partir du
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Date fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jusqu'au
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Bouton clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X size={16} />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Info filtrage par défaut */}
        {!hasActiveFilters && (
          <p className="text-sm text-gray-600 mb-4">
            📅 Affichage des événements du jour et des 10 prochains jours
          </p>
        )}

        {/* Liste des événements */}
        {filteredEvents.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Événements ({filteredEvents.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters ? "Aucun résultat" : "Aucun événement"}
            </h3>
            <p className="text-gray-600">
              {hasActiveFilters
                ? "Aucun événement ne correspond à vos critères de recherche."
                : "Aucun événement n'est disponible pour les 10 prochains jours."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Voir tous les événements
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const navigate = useNavigate();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      onClick={() => navigate(`/events/${event.slug}`)}
      className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          {event.published && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Publié
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar size={16} className="text-gray-400" />
          <span>{formatDate(event.event_date)}</span>
        </div>

        {/* CTA */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
            <Navigation size={16} />
            <span>Voir la navigation</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
