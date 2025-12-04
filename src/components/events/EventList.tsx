import React from "react";
import { EventCard } from "./EventCard";
import { Calendar } from "lucide-react";
import type { Event } from "@/types";

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onTogglePublish: (event: Event) => void;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  onEdit,
  onDelete,
  onTogglePublish,
}) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Calendar className="text-gray-400" size={32} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucun événement
        </h3>
        <p className="text-gray-600">
          Commencez par créer votre premier événement
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePublish={onTogglePublish}
        />
      ))}
    </div>
  );
};
