import React from "react";
import { Search } from "lucide-react";

export type EventFilter = "all" | "published" | "draft";

interface EventFiltersProps {
  activeFilter: EventFilter;
  onFilterChange: (filter: EventFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const filters: { value: EventFilter; label: string }[] = [
    { value: "all", label: "Tous" },
    { value: "published", label: "Publiés" },
    { value: "draft", label: "Brouillons" },
  ];

  return (
    <div className="space-y-4">
      {/* Filtres par statut */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              flex-1 py-2 px-4 rounded font-medium transition-all duration-fast
              ${
                activeFilter === filter.value
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }
            `}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un événement..."
          className="
            w-full pl-10 pr-4 py-3
            border border-gray-300 rounded
            text-base text-gray-900
            placeholder:text-gray-400
            transition-all duration-fast
            focus:outline-none focus:ring-0
            focus:border-primary focus:shadow-focus
          "
        />
      </div>
    </div>
  );
};
