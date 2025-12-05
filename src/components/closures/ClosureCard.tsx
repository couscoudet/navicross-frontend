import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Clock,
  Edit2,
  Trash2,
  MapPin,
  Route,
  Map as MapIcon,
} from "lucide-react";
import type { Closure } from "@/types";

interface ClosureCardProps {
  closure: Closure;
  onEdit: (closure: Closure) => void;
  onDelete: (closure: Closure) => void;
}

export const ClosureCard: React.FC<ClosureCardProps> = ({
  closure,
  onEdit,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const typeConfig = {
    barrier: { label: "Barrage", icon: MapPin, variant: "barrier" as const },
    segment: { label: "Tronçon", icon: Route, variant: "segment" as const },
    zone: { label: "Zone", icon: MapIcon, variant: "zone" as const },
  };

  const config = typeConfig[closure.type];
  const Icon = config.icon;

  const startTime = new Date(closure.start_time);
  const endTime = new Date(closure.end_time);
  const formattedStart = format(startTime, "dd MMM yyyy HH:mm", { locale: fr });
  const formattedEnd = format(endTime, "HH:mm", { locale: fr });

  const handleDelete = () => {
    if (isDeleting) {
      onDelete(closure);
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
    }
  };

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon size={18} className={`flex-shrink-0 text-${config.variant}`} />
          <h4 className="font-bold text-gray-900 truncate">{closure.name}</h4>
        </div>
        <Badge variant={config.variant} className="ml-2 flex-shrink-0">
          {config.label}
        </Badge>
      </div>

      {/* Horaires */}
      <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
        <Clock size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <div>{formattedStart}</div>
          <div>→ {formattedEnd}</div>
        </div>
      </div>

      {/* Description */}
      {closure.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {closure.description}
        </p>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200 mt-auto">
        <Button variant="secondary" size="sm" onClick={() => onEdit(closure)}>
          <Edit2 size={16} />
          Éditer
        </Button>
        <Button
          variant={isDeleting ? "danger" : "secondary"}
          size="sm"
          onClick={handleDelete}
        >
          <Trash2 size={16} />
          {isDeleting ? "Confirmer" : "Supprimer"}
        </Button>
      </div>
    </Card>
  );
};
