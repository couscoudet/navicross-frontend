import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Calendar, Edit2, Trash2, Eye, EyeOff, Map } from "lucide-react";
import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onTogglePublish: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onTogglePublish,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Formater la date
  const eventDate = new Date(event.event_date);
  const formattedDate = format(eventDate, "dd MMMM yyyy", { locale: fr });
  const formattedTime = format(eventDate, "HH:mm", { locale: fr });

  const handleDelete = () => {
    if (isDeleting) {
      onDelete(event);
    } else {
      setIsDeleting(true);
      // Annuler après 3 secondes
      setTimeout(() => setIsDeleting(false), 3000);
    }
  };

  return (
    <Card hover className="flex flex-col h-full">
      {/* Header avec statut */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
            {event.name}
          </h3>
          <p className="text-sm text-gray-500 font-mono truncate">
            /{event.slug}
          </p>
        </div>
        <Badge
          variant={event.published ? "success" : "warning"}
          className="ml-2 flex-shrink-0"
        >
          {event.published ? "Publié" : "Brouillon"}
        </Badge>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-gray-600 mb-4">
        <Calendar size={16} className="flex-shrink-0" />
        <span className="text-sm">
          {formattedDate} à {formattedTime}
        </span>
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Spacer pour pousser les boutons en bas */}
      <div className="flex-1" />

      {/* Actions - Layout responsive */}
      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-200">
        {/* Éditer - 1ère ligne, colonne gauche */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(event)}
          className="w-full"
        >
          <Edit2 size={16} />
          Éditer
        </Button>

        {/* Publier/Dépublier - 1ère ligne, colonne droite */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onTogglePublish(event)}
          className="w-full"
        >
          {event.published ? <EyeOff size={16} /> : <Eye size={16} />}
          {event.published ? "Dépublier" : "Publier"}
        </Button>

        {/* Closures - 2ème ligne, colonne gauche */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/admin/events/${event.slug}`)}
          className="w-full"
        >
          <Map size={16} />
          Fermetures
        </Button>

        {/* Supprimer - 2ème ligne, colonne droite */}
        <Button
          variant={isDeleting ? "danger" : "secondary"}
          size="sm"
          onClick={handleDelete}
          className="w-full"
        >
          <Trash2 size={16} />
          {isDeleting ? "Confirmer ?" : "Supprimer"}
        </Button>
      </div>
    </Card>
  );
};
