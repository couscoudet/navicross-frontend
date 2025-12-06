import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { PublicMap } from "@/components/public/PublicMap";
import { RouteForm } from "@/components/public/RouteForm";
import { RouteInfo } from "@/components/public/RouteInfo";
import { api } from "@/services/api";
import type { Event, Closure } from "@/types";

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteResult {
  distance: number; // mètres
  duration: number; // secondes
  geometry: GeoJSON.LineString;
  steps?: Array<{
    distance: number;
    duration: number;
    instruction: string;
    name?: string;
  }>;
  warnings?: string[];
}

export const PublicEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const { data: event } = useQuery<Event>({
    queryKey: ["event", slug],
    queryFn: () => api.events.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: closures = [] } = useQuery<Closure[]>({
    queryKey: ["closures", slug],
    queryFn: () => api.closures.getByEvent(slug!),
    enabled: !!slug,
  });

  const handleCalculateRoute = async (orig: Coordinates, dest: Coordinates) => {
    if (!event) return;

    setCalculating(true);
    setOrigin(orig);
    setDestination(dest);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: [orig.lng, orig.lat],
          destination: [dest.lng, dest.lat],
          profile: "driving",
          eventSlug: event.slug,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        // Gérer les erreurs Valhalla
        if (
          error.error_code === 442 ||
          error.error?.includes("No path could be found")
        ) {
          throw new Error(
            "Aucun itinéraire trouvé. Les zones à éviter bloquent tous les chemins possibles."
          );
        }

        if (error.error_code === 171) {
          throw new Error(
            "Zone à éviter trop grande. Veuillez réduire la taille des fermetures."
          );
        }

        throw new Error(error.message || "Impossible de calculer l'itinéraire");
      }

      const data = await response.json();
      setRoute(data);
    } catch (error) {
      console.error("Route error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de calculer l'itinéraire"
      );
    } finally {
      setCalculating(false);
    }
  };

  const handleReset = () => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
  };

  if (!event) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filtrer les closures actives
  const now = new Date();
  const activeClosures = closures.filter((closure) => {
    const start = new Date(closure.start_time);
    const end = new Date(closure.end_time);
    return now >= start && now <= end;
  });

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50">
      <Header />

      {/* Event Info Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="container-custom">
          <h1 className="text-lg font-semibold text-gray-900">{event.name}</h1>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span>
              {new Date(event.event_date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {activeClosures.length > 0 && (
              <div className="flex items-center gap-1.5 text-red-600">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span>
                  {activeClosures.length} fermeture
                  {activeClosures.length > 1 ? "s" : ""} active
                  {activeClosures.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <PublicMap
          closures={activeClosures}
          route={route?.geometry}
          origin={origin}
          destination={destination}
        />

        {/* Route Info Overlay */}
        {route && (
          <div className="absolute top-4 left-4 right-4 md:left-auto md:w-80">
            <RouteInfo
              distance={route.distance}
              duration={route.duration}
              closuresCount={activeClosures.length}
            />
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <RouteForm onCalculate={handleCalculateRoute} loading={calculating} />
        {activeClosures.length === 0 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Aucune fermeture active pour le moment
          </p>
        )}
      </div>
    </div>
  );
};
