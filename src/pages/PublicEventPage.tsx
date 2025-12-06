import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { PublicMap } from "@/components/public/PublicMap";
import { RouteForm } from "@/components/public/RouteForm";
import { RouteInfo } from "@/components/public/RouteInfo";
import { NavigationPanel } from "@/components/public/NavigationPanel";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import { usePositionInterpolation, easingFunctions } from "@/hooks/usePositionInterpolation";
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
  const [navigating, setNavigating] = useState(false);
  const [rawPosition, setRawPosition] = useState<Coordinates | null>(null);

  const { watchPosition, clearWatch } = useGeolocation();
  const watchIdRef = useRef<number | null>(null);

  // Smooth position interpolation for better visual experience
  const currentPosition = usePositionInterpolation(rawPosition, {
    duration: 1000, // 1 second smooth transition
    easing: easingFunctions.easeOutQuad,
  });

  // Calculate route progress for visual feedback
  const routeProgress = useRouteProgress(
    currentPosition,
    route?.geometry || null
  );

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

  const handleStartNavigation = () => {
    console.log("handleStartNavigation called", { origin, destination });

    if (!origin || !destination) {
      console.error("Missing origin or destination!");
      return;
    }

    console.log("Starting navigation...");
    setNavigating(true);

    // Définir position initiale
    setRawPosition(origin);

    // Fallback : si pas de GPS après 3s, rester sur origin
    const fallbackTimeout = setTimeout(() => {
      console.warn("GPS timeout, using origin as position");
      setRawPosition(origin);
    }, 3000);

    // Démarrer le suivi GPS
    const id = watchPosition((pos) => {
      clearTimeout(fallbackTimeout);
      console.log("GPS position received:", pos);
      const currentPos = { lng: pos.lng, lat: pos.lat };

      // Mettre à jour la position actuelle (raw, will be interpolated)
      setRawPosition(currentPos);
      console.log("Current position set:", currentPos);

      // Recalculer si déviation > 50m
      if (origin) {
        const distance = calculateDistance(currentPos, origin);
        if (distance > 0.05) {
          // 50 mètres en km
          handleCalculateRoute(currentPos, destination!);
        }
      }
    });

    console.log("Watch ID:", id);
    watchIdRef.current = id;
  };

  const handleStopNavigation = () => {
    setNavigating(false);
    setRawPosition(null);
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
      }
    };
  }, [clearWatch]);

  // Calcul distance haversine
  const calculateDistance = (pos1: Coordinates, pos2: Coordinates): number => {
    const R = 6371; // Rayon terre en km
    const dLat = toRad(pos2.lat - pos1.lat);
    const dLng = toRad(pos2.lng - pos1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(pos1.lat)) *
        Math.cos(toRad(pos2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg: number) => deg * (Math.PI / 180);

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
          currentPosition={currentPosition}
          navigating={navigating}
          routeProgress={routeProgress}
        />

        {/* Navigation Panel - compact mobile */}
        {navigating && route && destination && currentPosition && (
          <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto md:w-96">
            <NavigationPanel
              currentPosition={currentPosition}
              destination={destination}
              totalDistance={route.distance}
              totalDuration={route.duration}
              onStop={handleStopNavigation}
              routeProgress={routeProgress}
            />
          </div>
        )}

        {/* Route Info Overlay - compact mobile */}
        {route && !navigating && (
          <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto md:w-80">
            <RouteInfo
              distance={route.distance}
              duration={route.duration}
              closuresCount={activeClosures.length}
            />
            <button
              onClick={() => {
                console.log("Button clicked!", { origin, destination });
                handleStartNavigation();
              }}
              className="mt-2 w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
            >
              Démarrer la navigation
            </button>
          </div>
        )}
      </div>

      {/* Form - masqué en navigation sur mobile */}
      <div
        className={`bg-white border-t border-gray-200 p-4 flex-shrink-0 ${
          navigating ? "hidden md:block" : ""
        }`}
      >
        <RouteForm
          onCalculate={handleCalculateRoute}
          onOriginChange={setOrigin}
          loading={calculating}
        />
        {activeClosures.length === 0 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Aucune fermeture active pour le moment
          </p>
        )}
      </div>
    </div>
  );
};
