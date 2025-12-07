import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { PublicMap, type SelectionMode } from "@/components/public/PublicMap";
import { RouteForm } from "@/components/public/RouteForm";
import { RouteInfo } from "@/components/public/RouteInfo";
import { NavigationPanel } from "@/components/public/NavigationPanel";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRouteProgress } from "@/hooks/useRouteProgress";
import {
  usePositionInterpolation,
  easingFunctions,
} from "@/hooks/usePositionInterpolation";
import { useTutorial } from "@/contexts/TutorialContext";
import { publicEventTutorialSteps } from "@/config/tutorials";
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
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");

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

  // Tutorial
  const { autoStartTutorial } = useTutorial();

  // Auto-démarrer le tutoriel à la première visite
  useEffect(() => {
    if (event) {
      autoStartTutorial("public-event", publicEventTutorialSteps);
    }
  }, [event, autoStartTutorial]);

  const handleCalculateRoute = async (orig: Coordinates, dest: Coordinates) => {
    if (!event) return;

    setCalculating(true);
    setOrigin(orig);
    setDestination(dest);

    // Timeout controller pour éviter les requêtes bloquées
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Gérer le rate limiting (429)
        if (response.status === 429) {
          console.warn("Rate limit reached, queue too large");
          if (!navigating) {
            alert(
              "Trop de requêtes en cours. Veuillez patienter quelques secondes."
            );
          }
          throw new Error("Rate limit exceeded");
        }

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
      clearTimeout(timeoutId);
      console.error("Route error:", error);

      // Ne pas alerter en navigation pour éviter d'interrompre
      if (!navigating) {
        if (error instanceof Error && error.name === "AbortError") {
          alert("La requête a pris trop de temps. Vérifiez votre connexion.");
        } else if (
          error instanceof Error &&
          error.message !== "Rate limit exceeded"
        ) {
          alert(
            error instanceof Error
              ? error.message
              : "Impossible de calculer l'itinéraire"
          );
        }
      } else {
        console.warn(
          "Route recalculation failed during navigation, continuing with current route"
        );
      }
      throw error; // Re-throw pour le catch du recalcul
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

    // Variables pour le throttle du recalcul
    let lastRecalculateTime = 0;
    let isRecalculating = false;
    const RECALCULATE_COOLDOWN = 15000; // 15 secondes minimum (5 cycles de queue backend)
    const DEVIATION_THRESHOLD = 0.05; // 50 mètres en km

    // Fallback : si pas de GPS après 3s, rester sur origin
    const fallbackTimeout = setTimeout(() => {
      console.warn("GPS timeout, using origin as position");
      setRawPosition(origin);
    }, 3000);

    // Throttle pour les mises à jour GPS
    let lastUpdateTime = 0;
    const GPS_UPDATE_INTERVAL = 4000; // 4 secondes

    // Démarrer le suivi GPS
    const id = watchPosition((pos) => {
      clearTimeout(fallbackTimeout);

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;

      // Ignorer les updates trop fréquentes
      if (timeSinceLastUpdate < GPS_UPDATE_INTERVAL) {
        console.log(
          `GPS update ignored (throttled): ${timeSinceLastUpdate}ms since last update`
        );
        return;
      }

      lastUpdateTime = now;
      console.log("GPS position received:", pos);
      const currentPos = { lng: pos.lng, lat: pos.lat };

      // Mettre à jour la position actuelle (raw, will be interpolated)
      setRawPosition(currentPos);
      console.log("Current position set:", currentPos);

      // Recalculer si déviation significative ET cooldown respecté
      if (routeProgress && destination) {
        const now = Date.now();
        const timeSinceLastRecalculate = now - lastRecalculateTime;

        // Vérifier si on dévie de la route
        const isOffRoute =
          !routeProgress.isOnRoute ||
          routeProgress.deviationDistance > DEVIATION_THRESHOLD;

        if (
          isOffRoute &&
          !isRecalculating &&
          timeSinceLastRecalculate >= RECALCULATE_COOLDOWN
        ) {
          console.log(
            `Recalculating route: deviation=${routeProgress.deviationDistance}km, isOnRoute=${routeProgress.isOnRoute}`
          );
          isRecalculating = true;
          lastRecalculateTime = now;

          handleCalculateRoute(currentPos, destination)
            .catch((error) => {
              console.error("Route recalculation failed:", error);
              // Ne pas bloquer la navigation en cas d'erreur
            })
            .finally(() => {
              isRecalculating = false;
            });
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
          selectionMode={selectionMode}
          onOriginSelect={(coords) => {
            setOrigin(coords);
            setSelectionMode("none");
            // Réinitialiser la destination si on resélectionne l'origine
            if (destination) {
              setDestination(null);
              setRoute(null);
            }
          }}
          onDestinationSelect={(coords) => {
            setDestination(coords);
            setSelectionMode("none");
            // Calculer automatiquement l'itinéraire
            if (origin) {
              handleCalculateRoute(origin, coords);
            }
          }}
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
        className={`bg-white border-t border-gray-200 flex-shrink-0 ${
          navigating ? "hidden md:block" : ""
        }`}
      >
        <RouteForm
          onCalculate={handleCalculateRoute}
          onOriginChange={setOrigin}
          loading={calculating}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          origin={origin}
          destination={destination}
        />
        {activeClosures.length === 0 && (
          <p className="text-sm text-gray-500 mt-2 pb-3 text-center">
            Aucune fermeture active pour le moment
          </p>
        )}
      </div>
    </div>
  );
};
