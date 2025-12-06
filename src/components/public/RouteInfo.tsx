import React from "react";
import { Navigation, Clock, AlertTriangle } from "lucide-react";

interface RouteInfoProps {
  distance: number; // mètres
  duration: number; // secondes
  closuresCount: number;
}

export const RouteInfo: React.FC<RouteInfoProps> = ({
  distance,
  duration,
  closuresCount,
}) => {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
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
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Navigation size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Distance</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatDistance(distance)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Clock size={16} className="text-green-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Durée</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatDuration(duration)}
            </div>
          </div>
        </div>
      </div>

      {closuresCount > 0 && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle
            size={14}
            className="flex-shrink-0 mt-0.5 text-amber-600"
          />
          <p className="text-xs text-amber-700">
            Itinéraire calculé en évitant {closuresCount} zone
            {closuresCount > 1 ? "s" : ""} fermée{closuresCount > 1 ? "s" : ""}.
          </p>
        </div>
      )}
    </div>
  );
};
