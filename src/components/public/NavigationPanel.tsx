import React, { useMemo } from "react";
import { Navigation, X } from "lucide-react";

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteResult {
  route: GeoJSON.LineString;
  distance: number;
  duration: number;
}

interface NavigationPanelProps {
  currentPosition: Coordinates | null;
  destination: Coordinates;
  totalDistance: number;
  totalDuration: number;
  onStop: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  currentPosition,
  destination,
  totalDistance,
  totalDuration,
  onStop,
}) => {
  const remainingDistance = useMemo(() => {
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
  }, [currentPosition, destination]);

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
    <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl">
      {/* Version compacte mobile */}
      <div className="md:hidden p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation size={20} />
            <div>
              <div className="text-xs opacity-75">Distance</div>
              <div className="text-xl font-bold">
                {formatDistance(remainingDistance)}
              </div>
            </div>
          </div>
          <button
            onClick={onStop}
            className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Version complète desktop */}
      <div className="hidden md:block p-4">
        <div className="flex items-start justify-between mb-4">
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
