import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Navigation, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Event } from "@/types";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: api.events.getAll,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

        {/* Liste des événements */}
        {events.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📅 Événements ({events.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun événement
            </h3>
            <p className="text-gray-600">
              Aucun événement n'est disponible pour le moment.
            </p>
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
