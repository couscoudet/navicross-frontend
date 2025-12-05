import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin } from "lucide-react";

interface AddressSearchProps {
  onSelectAddress: (lat: number, lng: number, label: string) => void;
}

interface Suggestion {
  lat: string;
  lon: string;
  display_name: string;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  onSelectAddress,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&countrycodes=fr`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Geocoding error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (suggestion: Suggestion) => {
    onSelectAddress(
      parseFloat(suggestion.lat),
      parseFloat(suggestion.lon),
      suggestion.display_name
    );
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative mb-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Rechercher une adresse..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
            >
              <MapPin
                size={16}
                className="flex-shrink-0 mt-0.5 text-gray-400"
              />
              <span className="text-gray-700">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {showSuggestions &&
        query.length >= 3 &&
        !loading &&
        suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            Aucune adresse trouvée
          </div>
        )}
    </div>
  );
};
