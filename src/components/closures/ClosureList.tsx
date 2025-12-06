import React, { useState } from "react";
import { ClosureCard } from "./ClosureCard";
import { Button } from "@/components/ui/Button";
import { MapPin, Route, Map as MapIcon } from "lucide-react";
import type { Closure } from "@/types";

interface ClosureListProps {
  closures: Closure[];
  onEdit: (closure: Closure) => void;
  onDelete: (closure: Closure) => void;
  onCreateBarrier: () => void;
  onCreateSegment: () => void;
  onCreateZone: () => void;
  isLoading?: boolean;
}

export const ClosureList: React.FC<ClosureListProps> = ({
  closures,
  onEdit,
  onDelete,
  onCreateBarrier,
  onCreateSegment,
  onCreateZone,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<"all" | "barrier" | "segment" | "zone">(
    "all"
  );

  const filteredClosures =
    filter === "all" ? closures : closures.filter((c) => c.type === filter);

  const counts = {
    all: closures.length,
    barrier: closures.filter((c) => c.type === "barrier").length,
    segment: closures.filter((c) => c.type === "segment").length,
    zone: closures.filter((c) => c.type === "zone").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Closures</h2>

        {/* Boutons de création */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button variant="secondary" size="sm" onClick={onCreateBarrier}>
            <MapPin size={16} />
            Barrage
          </Button>
          <Button variant="secondary" size="sm" onClick={onCreateSegment}>
            <Route size={16} />
            Tronçon
          </Button>
          <Button variant="secondary" size="sm" onClick={onCreateZone}>
            <MapIcon size={16} />
            Zone
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filter === "all"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tout ({counts.all})
          </button>
          <button
            onClick={() => setFilter("barrier")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filter === "barrier"
                ? "bg-barrier text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Barrages ({counts.barrier})
          </button>
          <button
            onClick={() => setFilter("segment")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filter === "segment"
                ? "bg-segment text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tronçons ({counts.segment})
          </button>
          <button
            onClick={() => setFilter("zone")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filter === "zone"
                ? "bg-zone text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Zones ({counts.zone})
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : filteredClosures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === "all"
              ? "Aucune closure. Créez-en une avec les boutons ci-dessus."
              : `Aucune closure de type ${filter}.`}
          </div>
        ) : (
          filteredClosures.map((closure) => (
            <ClosureCard
              key={closure.id}
              closure={closure}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};
