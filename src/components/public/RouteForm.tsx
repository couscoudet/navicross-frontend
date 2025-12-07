import React, { useState, useRef } from "react";
import { Search, Navigation, ArrowRight, Locate, MapPin } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface Coordinates {
  lng: number;
  lat: number;
}

export type SelectionMode = "none" | "origin" | "destination";

interface RouteFormProps {
  onCalculate: (origin: Coordinates, destination: Coordinates) => void;
  onOriginChange?: (origin: Coordinates | null) => void;
  loading: boolean;
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  origin?: Coordinates | null;
  destination?: Coordinates | null;
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
  selectionMode,
  onSelectionModeChange,
  origin,
  destination,
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

  // Sync with parent origin/destination
  React.useEffect(() => {
    if (origin && !selectedOrigin) {
      setSelectedOrigin(origin);
      if (!originQuery) setOriginQuery("📍 Point sur la carte");
    }
  }, [origin]);

  React.useEffect(() => {
    if (destination && !selectedDest) {
      setSelectedDest(destination);
      if (!destQuery) setDestQuery("📍 Point sur la carte");
    }
  }, [destination]);

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
    const coords = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    };
    setOriginQuery(suggestion.display_name.split(",")[0]);
    setSelectedOrigin(coords);
    onOriginChange?.(coords);
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
    <form
      onSubmit={handleSubmit}
      className="p-3"
      data-tutorial="address-search"
    >
      <h2 className="text-sm font-semibold text-gray-900 mb-2">
        Calculer un itinéraire
      </h2>

      {/* Départ */}
      <div className="mb-2 relative">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Départ
        </label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={originQuery}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => setShowOriginSuggestions(true)}
              placeholder="Gare de Nevers..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              disabled={loading}
            />
            <Navigation
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={loading || geoLoading}
            className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Ma position"
          >
            {geoLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Locate size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectionModeChange(
                selectionMode === "origin" ? "none" : "origin"
              )
            }
            disabled={loading}
            className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center justify-center transition-all ${
              selectionMode === "origin"
                ? "bg-green-600 text-white ring-2 ring-green-400"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
            title="Sélectionner sur la carte"
          >
            <MapPin size={14} />
          </button>
        </div>

        {showOriginSuggestions && originSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {originSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectOrigin(suggestion)}
                className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
              >
                <Search
                  size={12}
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
      {/* <div className="flex justify-center -my-0.5 mb-1.5">
        <button
          type="button"
          onClick={swap}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={loading}
        >
          <ArrowRight size={12} className="rotate-90 text-gray-600" />
        </button>
      </div> */}

      {/* Arrivée */}
      <div className="mb-3 relative">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Arrivée
        </label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => setShowDestSuggestions(true)}
              placeholder="Stade de Nevers..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              disabled={loading}
            />
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              onSelectionModeChange(
                selectionMode === "destination" ? "none" : "destination"
              )
            }
            disabled={loading}
            className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center justify-center transition-all ${
              selectionMode === "destination"
                ? "bg-red-600 text-white ring-2 ring-red-400"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
            title="Sélectionner sur la carte"
          >
            <MapPin size={14} />
          </button>
        </div>

        {showDestSuggestions && destSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {destSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectDest(suggestion)}
                className="w-full px-2.5 py-1.5 text-left text-sm hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
              >
                <Search
                  size={12}
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

      {/* Indicateur de mode de sélection */}
      {selectionMode !== "none" && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs">
          <MapPin size={14} className="text-blue-600 flex-shrink-0" />
          <span className="text-blue-700 font-medium flex-1">
            {selectionMode === "origin"
              ? "Cliquez sur la carte pour placer le départ"
              : "Cliquez sur la carte pour placer l'arrivée"}
          </span>
          <button
            type="button"
            onClick={() => onSelectionModeChange("none")}
            className="text-blue-600 hover:text-blue-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedOrigin || !selectedDest || loading}
        className="w-full bg-primary text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Calcul en cours..." : "Calculer l'itinéraire"}
      </button>
    </form>
  );
};
