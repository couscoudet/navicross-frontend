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

  // ===== TOUS LES useState =====
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [rawPosition, setRawPosition] = useState<Coordinates | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
  const [eventInfoCollapsed, setEventInfoCollapsed] = useState(false);
  const [routeFormCollapsed, setRouteFormCollapsed] = useState(false);
  const [routeInfoCollapsed, setRouteInfoCollapsed] = useState(false);

  // Type de traceur pour la navigation
  const [trackerType, setTrackerType] = useState<
    "beer" | "medal" | "car" | "monster" | "triangle"
  >(() => {
    return (localStorage.getItem("navicross_tracker_type") as any) || "beer";
  });
  const [trackerColor, setTrackerColor] = useState(() => {
    return localStorage.getItem("navicross_tracker_color") || "#FF8C00";
  });

  // ===== TOUS LES useRef =====
  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<RouteResult | null>(null);
  const destinationRef = useRef<Coordinates | null>(null);

  // ===== HOOKS CUSTOM =====
  const { watchPosition, clearWatch } = useGeolocation();
  const currentPosition = usePositionInterpolation(rawPosition, {
    duration: 1000,
    easing: easingFunctions.easeOutQuad,
  });
  const routeProgress = useRouteProgress(
    currentPosition,
    route?.geometry || null
  );

  // ===== QUERIES =====
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

  const { autoStartTutorial } = useTutorial();

  // ===== TOUS LES useEffect À LA FIN =====
  // Auto-démarrer le tutoriel à la première visite
  useEffect(() => {
    if (event) {
      autoStartTutorial("public-event", publicEventTutorialSteps);
    }
  }, [event, autoStartTutorial]);

  // Auto-collapse lors de sélection sur carte
  useEffect(() => {
    if (selectionMode !== "none") {
      setEventInfoCollapsed(true);
      setRouteFormCollapsed(true);
    }
  }, [selectionMode]);

  // Auto-collapse RouteForm et expand RouteInfo quand route calculée
  useEffect(() => {
    if (route && !navigating) {
      setRouteFormCollapsed(true);
      setRouteInfoCollapsed(false);
    }
  }, [route, navigating]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
      }
    };
  }, [clearWatch]);

  // Sauvegarder choix traceur
  useEffect(() => {
    localStorage.setItem("navicross_tracker_type", trackerType);
    localStorage.setItem("navicross_tracker_color", trackerColor);
  }, [trackerType, trackerColor]);

  // 🐛 DEBUG: Logger les closures actives
  useEffect(() => {
    const activeClosuresList = closures.filter((closure) => {
      const start = new Date(closure.start_time);
      const end = new Date(closure.end_time);
      const now = new Date();
      return now >= start && now <= end;
    });

    if (activeClosuresList.length > 0) {
      console.log(
        "🔴 Active closures:",
        activeClosuresList.map((c) => ({
          id: c.id,
          name: c.name,
          points: c.polygon.coordinates[0].length,
          bounds: {
            minLng: Math.min(...c.polygon.coordinates[0].map((p) => p[0])),
            maxLng: Math.max(...c.polygon.coordinates[0].map((p) => p[0])),
            minLat: Math.min(...c.polygon.coordinates[0].map((p) => p[1])),
            maxLat: Math.max(...c.polygon.coordinates[0].map((p) => p[1])),
          },
        }))
      );
    }
  }, [closures]);

  const handleCalculateRoute = async (orig: Coordinates, dest: Coordinates) => {
    if (!event) return;

    setCalculating(true);
    setOrigin(orig);
    setDestination(dest);
    destinationRef.current = dest; // ✅ Sync ref
    destinationRef.current = dest; // Sync ref for watchPosition closure

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
          // Proposer un itinéraire sans éviter les closures
          const retryWithoutClosures = confirm(
            "Aucun itinéraire trouvé en évitant les fermetures. Voulez-vous calculer un itinéraire direct ?"
          );

          if (retryWithoutClosures && !navigating) {
            // Retry sans eventSlug (pas de closures)
            const retryResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/route`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  origin: [orig.lng, orig.lat],
                  destination: [dest.lng, dest.lat],
                  profile: "driving",
                  // Pas d'eventSlug = pas de closures
                }),
              }
            );

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setRoute(data);
              routeRef.current = data;
              console.log("✅ Route calculated without closures");
              setCalculating(false);
              return; // Succès !
            }
          }

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
      routeRef.current = data; // ✅ Sync ref
      console.log("✅ Route calculated and ref updated:", data);
      routeRef.current = data; // Sync ref for watchPosition closure
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

  if (!event) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filtrer les closures actives (calcul normal, pas dans useEffect)
  const now = new Date();
  const activeClosures = closures.filter((closure) => {
    const start = new Date(closure.start_time);
    const end = new Date(closure.end_time);
    return now >= start && now <= end;
  });

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50">
      <Header />

      {/* Event Info Bar - Collapsible */}
      <div
        className="bg-white border-b border-gray-200 flex-shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setEventInfoCollapsed(!eventInfoCollapsed)}
      >
        <div className="container-custom px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              {event.name}
            </h1>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                eventInfoCollapsed ? "" : "rotate-180"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {!eventInfoCollapsed && (
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
          )}
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
          trackerType={trackerType}
          trackerColor={trackerColor}
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

        {/* Route Info Overlay - Collapsible */}
        {route && !navigating && (
          <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto md:w-80">
            <div
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer"
              onClick={() => setRouteInfoCollapsed(!routeInfoCollapsed)}
            >
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <span className="font-semibold text-gray-900">Itinéraire</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    routeInfoCollapsed ? "" : "rotate-180"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {!routeInfoCollapsed && (
                <div className="p-4">
                  <RouteInfo
                    distance={route.distance}
                    duration={route.duration}
                    closuresCount={activeClosures.length}
                  />

                  {/* Sélecteur de traceur */}
                  <div
                    className="mt-4 border-t pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Traceur de navigation
                    </label>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {[
                        { type: "beer", emoji: "🍺", label: "Bière" },
                        { type: "medal", emoji: "🥇", label: "Médaille" },
                        { type: "car", emoji: "🚗", label: "Voiture" },
                        { type: "monster", emoji: "👾", label: "Monstre" },
                        { type: "triangle", emoji: "▲", label: "Triangle" },
                      ].map((option) => (
                        <button
                          key={option.type}
                          onClick={() => setTrackerType(option.type as any)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
                            trackerType === option.type
                              ? "border-primary bg-primary/10 scale-105"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          title={option.label}
                        >
                          <span className="text-2xl">{option.emoji}</span>
                        </button>
                      ))}
                    </div>

                    {/* Color picker pour triangle */}
                    {trackerType === "triangle" && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">
                          Couleur:
                        </label>
                        <input
                          type="color"
                          value={trackerColor}
                          onChange={(e) => setTrackerColor(e.target.value)}
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <span className="text-xs text-gray-500">
                          {trackerColor}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Button clicked!", { origin, destination });
                      handleStartNavigation();
                    }}
                    className="mt-3 w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                  >
                    Démarrer la navigation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form - Collapsible, masqué en navigation sur mobile */}
      <div
        className={`bg-white border-t border-gray-200 flex-shrink-0 ${
          navigating ? "hidden md:block" : ""
        }`}
      >
        <div
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
          onClick={() => setRouteFormCollapsed(!routeFormCollapsed)}
        >
          <span className="font-semibold text-gray-900">
            Calculer un itinéraire
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              routeFormCollapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {!routeFormCollapsed && (
          <div>
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
        )}
      </div>
    </div>
  );
};
