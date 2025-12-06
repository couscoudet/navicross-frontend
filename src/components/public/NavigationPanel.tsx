import React, { useMemo } from "react";
import { Navigation, X, TrendingUp } from "lucide-react";

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteProgress {
  distanceTraveled: number;
  distanceRemaining: number;
  totalDistance: number;
  percentComplete: number;
  isOnRoute: boolean;
  deviationDistance: number;
}

interface NavigationPanelProps {
  currentPosition: Coordinates | null;
  destination: Coordinates;
  totalDistance: number;
  totalDuration: number;
  onStop: () => void;
  routeProgress?: RouteProgress | null;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  currentPosition,
  destination,
  totalDistance,
  totalDuration,
  onStop,
  routeProgress,
}) => {
  // Use route progress if available, otherwise calculate straight-line distance
  const remainingDistance = useMemo(() => {
    if (routeProgress) {
      return Math.round(routeProgress.distanceRemaining);
    }

    if (!currentPosition) return totalDistance;

    // Distance à vol d'oiseau entre position actuelle et destination
    const R = 6371000; // Rayon terre en mètres
    const dLat = ((destination.lat - currentPosition.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - currentPosition.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentPosition.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [currentPosition, destination, routeProgress, totalDistance]);

  const progressPercent = useMemo(() => {
    if (routeProgress) {
      return routeProgress.percentComplete;
    }
    if (!currentPosition || totalDistance === 0) return 0;
    return Math.max(0, Math.min(100, ((totalDistance - remainingDistance) / totalDistance) * 100));
  }, [routeProgress, currentPosition, totalDistance, remainingDistance]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl overflow-hidden">
      {/* Barre de progression */}
      <div className="h-1 bg-blue-900 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 animate-pulse opacity-50 bg-white"></div>
        </div>
      </div>

      {/* Version compacte mobile */}
      <div className="md:hidden p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Navigation size={20} />
            <div>
              <div className="text-xs opacity-75">Distance restante</div>
              <div className="text-xl font-bold">
                {formatDistance(remainingDistance)}
              </div>
            </div>
          </div>
          <button
            onClick={onStop}
            className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress info */}
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp size={14} className="opacity-75" />
          <span className="opacity-90">
            {progressPercent.toFixed(0)}% du trajet
          </span>
          {routeProgress && !routeProgress.isOnRoute && (
            <span className="ml-auto px-2 py-0.5 bg-amber-500 bg-opacity-90 rounded text-xs">
              Hors itinéraire
            </span>
          )}
        </div>
      </div>

      {/* Version complète desktop */}
      <div className="hidden md:block p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Navigation size={24} />
            </div>
            <div>
              <div className="text-sm opacity-90">Distance restante</div>
              <div className="text-3xl font-bold">
                {formatDistance(remainingDistance)}
              </div>
            </div>
          </div>
          <button
            onClick={onStop}
            className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mb-3 p-2 bg-white bg-opacity-10 rounded-lg flex items-center gap-2">
          <TrendingUp size={16} className="opacity-75" />
          <div className="flex-1">
            <div className="text-xs opacity-75 mb-1">Progression</div>
            <div className="text-sm font-semibold">
              {progressPercent.toFixed(1)}% du trajet effectué
            </div>
          </div>
          {routeProgress && !routeProgress.isOnRoute && (
            <span className="px-2 py-1 bg-amber-500 bg-opacity-90 rounded text-xs">
              Hors itinéraire
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-xs opacity-75">Temps estimé</div>
            <div className="text-lg font-semibold">
              {formatDuration(totalDuration)}
            </div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <div className="text-xs opacity-75">Distance totale</div>
            <div className="text-lg font-semibold">
              {formatDistance(totalDistance)}
            </div>
          </div>
        </div>

        {!currentPosition && (
          <div className="mt-3 p-2 bg-amber-500 bg-opacity-90 rounded-lg text-sm text-center">
            En attente de la position GPS...
          </div>
        )}
      </div>
    </div>
  );
};
