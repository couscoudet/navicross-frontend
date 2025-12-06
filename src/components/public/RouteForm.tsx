import React, { useState, useRef } from "react";
import { Search, Navigation, ArrowRight, Locate } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteFormProps {
  onCalculate: (origin: Coordinates, destination: Coordinates) => void;
  onOriginChange?: (origin: Coordinates | null) => void;
  loading: boolean;
}

interface Suggestion {
  lat: string;
  lon: string;
  display_name: string;
}

export const RouteForm: React.FC<RouteFormProps> = ({
  onCalculate,
  onOriginChange,
  loading,
}) => {
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<Suggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<Suggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<Coordinates | null>(
    null
  );
  const [selectedDest, setSelectedDest] = useState<Coordinates | null>(null);

  const { getCurrentPosition, loading: geoLoading } = useGeolocation();

  const originDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const destDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleUseCurrentLocation = async () => {
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        const coords = { lng: pos.lng, lat: pos.lat };
        setSelectedOrigin(coords);
        setOriginQuery("📍 Ma position");
        onOriginChange?.(coords);
      } else {
        alert(
          "Impossible d'obtenir votre position. Vérifiez les autorisations de localisation."
        );
      }
    } catch (error) {
      console.error("Geolocation error:", error);
      alert("Erreur de géolocalisation. Sur mobile, HTTPS est requis.");
    }
  };

  const searchAddress = async (
    query: string,
    setSuggestions: (s: Suggestion[]) => void
  ) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/geocode/search?q=${encodeURIComponent(
          query
        )}&limit=5`
      );

      if (!response.ok) {
        console.error("Geocoding failed:", response.status);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Geocoding error:", error);
      setSuggestions([]);
    }
  };

  const handleOriginChange = (value: string) => {
    setOriginQuery(value);
    setShowOriginSuggestions(true);
    setSelectedOrigin(null);

    if (originDebounceRef.current) clearTimeout(originDebounceRef.current);
    originDebounceRef.current = setTimeout(() => {
      searchAddress(value, setOriginSuggestions);
    }, 300);
  };

  const handleDestChange = (value: string) => {
    setDestQuery(value);
    setShowDestSuggestions(true);
    setSelectedDest(null);

    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => {
      searchAddress(value, setDestSuggestions);
    }, 300);
  };

  const selectOrigin = (suggestion: Suggestion) => {
    setOriginQuery(suggestion.display_name.split(",")[0]);
    setSelectedOrigin({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setOriginSuggestions([]);
    setShowOriginSuggestions(false);
  };

  const selectDest = (suggestion: Suggestion) => {
    setDestQuery(suggestion.display_name.split(",")[0]);
    setSelectedDest({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    });
    setDestSuggestions([]);
    setShowDestSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrigin && selectedDest) {
      onCalculate(selectedOrigin, selectedDest);
    }
  };

  const swap = () => {
    const tempQuery = originQuery;
    const tempCoords = selectedOrigin;
    setOriginQuery(destQuery);
    setSelectedOrigin(selectedDest);
    setDestQuery(tempQuery);
    setSelectedDest(tempCoords);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3">
        Calculer un itinéraire
      </h2>

      {/* Départ */}
      <div className="mb-3 relative">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Départ
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={originQuery}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => setShowOriginSuggestions(true)}
              placeholder="Gare de Nevers..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              disabled={loading}
            />
            <Navigation
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={loading || geoLoading}
            className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Utiliser ma position"
          >
            {geoLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Locate size={16} />
            )}
          </button>
        </div>

        {showOriginSuggestions && originSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {originSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectOrigin(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
              >
                <Search
                  size={14}
                  className="flex-shrink-0 mt-0.5 text-gray-400"
                />
                <span className="text-gray-700 text-xs">
                  {suggestion.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bouton swap */}
      <div className="flex justify-center -my-1 mb-2">
        <button
          type="button"
          onClick={swap}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={loading}
        >
          <ArrowRight size={14} className="rotate-90 text-gray-600" />
        </button>
      </div>

      {/* Arrivée */}
      <div className="mb-4 relative">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Arrivée
        </label>
        <div className="relative">
          <input
            type="text"
            value={destQuery}
            onChange={(e) => handleDestChange(e.target.value)}
            onFocus={() => setShowDestSuggestions(true)}
            placeholder="Stade de Nevers..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            disabled={loading}
          />
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>

        {showDestSuggestions && destSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {destSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectDest(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
              >
                <Search
                  size={14}
                  className="flex-shrink-0 mt-0.5 text-gray-400"
                />
                <span className="text-gray-700 text-xs">
                  {suggestion.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedOrigin || !selectedDest || loading}
        className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Calcul en cours..." : "Calculer l'itinéraire"}
      </button>
    </form>
  );
};
