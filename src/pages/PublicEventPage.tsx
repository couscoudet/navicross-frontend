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
  distance: number; // mÃ¨tres
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

  // ✅ Refs pour éviter stale closures dans watchPosition callback
  const routeRef = useRef<RouteResult | null>(null);
  const destinationRef = useRef<Coordinates | null>(null);

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

  // Auto-dÃ©marrer le tutoriel Ã  la premiÃ¨re visite
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
    destinationRef.current = dest; // ✅ Sync ref
    destinationRef.current = dest; // Sync ref for watchPosition closure

    // Timeout controller pour Ã©viter les requÃªtes bloquÃ©es
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
        // GÃ©rer le rate limiting (429)
        if (response.status === 429) {
          console.warn("Rate limit reached, queue too large");
          if (!navigating) {
            alert(
              "Trop de requÃªtes en cours. Veuillez patienter quelques secondes."
            );
          }
          throw new Error("Rate limit exceeded");
        }

        const error = await response.json();

        // GÃ©rer les erreurs Valhalla
        if (
          error.error_code === 442 ||
          error.error?.includes("No path could be found")
        ) {
          throw new Error(
            "Aucun itinÃ©raire trouvÃ©. Les zones Ã  Ã©viter bloquent tous les chemins possibles."
          );
        }

        if (error.error_code === 171) {
          throw new Error(
            "Zone Ã  Ã©viter trop grande. Veuillez rÃ©duire la taille des fermetures."
          );
        }

        throw new Error(
          error.message || "Impossible de calculer l'itinÃ©raire"
        );
      }

      const data = await response.json();
      setRoute(data);
      routeRef.current = data; // ✅ Sync ref
      console.log("✅ Route calculated and ref updated:", data);
      routeRef.current = data; // Sync ref for watchPosition closure
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Route error:", error);

      // Ne pas alerter en navigation pour Ã©viter d'interrompre
      if (!navigating) {
        if (error instanceof Error && error.name === "AbortError") {
          alert("La requÃªte a pris trop de temps. VÃ©rifiez votre connexion.");
        } else if (
          error instanceof Error &&
          error.message !== "Rate limit exceeded"
        ) {
          alert(
            error instanceof Error
              ? error.message
              : "Impossible de calculer l'itinÃ©raire"
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
    console.log("🚀 === START NAVIGATION ===");
    console.log("📍 Origin:", origin);
    console.log("🎯 Destination:", destination);
    console.log("🗺️ Route exists:", !!route);
    console.log("📏 Route ref exists:", !!routeRef.current);

    if (!origin || !destination) {
      console.error("❌ Missing origin or destination!");
      return;
    }

    console.log("✅ Starting navigation...");
    setNavigating(true);

    setRawPosition(origin);

    let lastRecalculateTime = 0;
    let isRecalculating = false;
    const RECALCULATE_COOLDOWN = 8000;
    const DEVIATION_THRESHOLD = 50;

    console.log(
      "⚙️ Config: cooldown=" +
        RECALCULATE_COOLDOWN +
        "ms, threshold=" +
        DEVIATION_THRESHOLD +
        "m"
    );

    const fallbackTimeout = setTimeout(() => {
      console.warn("⏰ GPS timeout, using origin as position");
      setRawPosition(origin);
    }, 3000);

    let lastUpdateTime = 0;
    const GPS_UPDATE_INTERVAL = 2000;

    const id = watchPosition((pos) => {
      clearTimeout(fallbackTimeout);

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;

      if (timeSinceLastUpdate < GPS_UPDATE_INTERVAL) {
        console.log(
          `⏭️ GPS update ignored (throttled): ${timeSinceLastUpdate}ms since last update`
        );
        return;
      }

      lastUpdateTime = now;
      console.log("📡 GPS position received:", pos);
      const currentPos = { lng: pos.lng, lat: pos.lat };

      setRawPosition(currentPos);

      const currentRoute = routeRef.current;
      const currentDestination = destinationRef.current;

      console.log("🔍 Checking deviation...");
      console.log("  - Route ref:", !!currentRoute);
      console.log("  - Destination ref:", currentDestination);
      console.log("  - Current position:", currentPos);

      if (currentRoute?.geometry && currentDestination) {
        const timeSinceLastRecalculate = now - lastRecalculateTime;

        try {
          const routeCoords = currentRoute.geometry.coordinates as number[][];

          let minDistDegrees = Infinity;
          routeCoords.forEach((coord) => {
            const distDegrees = Math.sqrt(
              Math.pow(coord[0] - currentPos.lng, 2) +
                Math.pow(coord[1] - currentPos.lat, 2)
            );
            if (distDegrees < minDistDegrees) minDistDegrees = distDegrees;
          });

          const deviationMeters = minDistDegrees * 111000;
          const isOffRoute = deviationMeters > DEVIATION_THRESHOLD;

          console.log(`📊 DEVIATION CHECK:`);
          console.log(`  - Distance to route: ${deviationMeters.toFixed(1)}m`);
          console.log(`  - Is off route: ${isOffRoute}`);
          console.log(
            `  - Cooldown: ${(timeSinceLastRecalculate / 1000).toFixed(1)}s / ${
              RECALCULATE_COOLDOWN / 1000
            }s`
          );
          console.log(`  - Is recalculating: ${isRecalculating}`);

          if (
            isOffRoute &&
            !isRecalculating &&
            timeSinceLastRecalculate >= RECALCULATE_COOLDOWN
          ) {
            console.warn(`🔄 ========== RECALCUL DÉCLENCHÉ ==========`);
            console.warn(`   Deviation: ${deviationMeters.toFixed(0)}m`);
            console.warn(
              `   From: ${currentPos.lng.toFixed(6)}, ${currentPos.lat.toFixed(
                6
              )}`
            );
            console.warn(
              `   To: ${currentDestination.lng.toFixed(
                6
              )}, ${currentDestination.lat.toFixed(6)}`
            );

            isRecalculating = true;
            lastRecalculateTime = now;

            handleCalculateRoute(currentPos, currentDestination)
              .then(() => {
                console.log("✅ Recalcul réussi!");
              })
              .catch((error) => {
                console.error("❌ Route recalculation failed:", error);
              })
              .finally(() => {
                isRecalculating = false;
                console.log("🏁 Recalcul terminé (flag cleared)");
              });
          } else if (
            isOffRoute &&
            timeSinceLastRecalculate < RECALCULATE_COOLDOWN
          ) {
            console.log(
              `⏳ Déviation détectée mais cooldown actif (${(
                (RECALCULATE_COOLDOWN - timeSinceLastRecalculate) /
                1000
              ).toFixed(1)}s restantes)`
            );
          } else if (isOffRoute && isRecalculating) {
            console.log(`⏳ Déviation détectée mais recalcul déjà en cours`);
          }
        } catch (error) {
          console.error("❌ Error calculating deviation:", error);
        }
      } else {
        console.warn("⚠️ Cannot check deviation:");
        console.warn("  - Route geometry:", !!currentRoute?.geometry);
        console.warn("  - Destination:", !!currentDestination);
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

  // Cleanup au dÃ©montage
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
            // RÃ©initialiser la destination si on resÃ©lectionne l'origine
            if (destination) {
              setDestination(null);
              setRoute(null);
            }
          }}
          onDestinationSelect={(coords) => {
            setDestination(coords);
            setSelectionMode("none");
            // Calculer automatiquement l'itinÃ©raire
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
              DÃ©marrer la navigation
            </button>
          </div>
        )}
      </div>

      {/* Form - masquÃ© en navigation sur mobile */}
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
