import React, { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EventFilters, EventFilter } from "@/components/events/EventFilters";
import { EventList } from "@/components/events/EventList";
import { EventForm } from "@/components/events/EventForm";
import { Plus, Loader2 } from "lucide-react";
import {
  useMyEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useTogglePublishEvent,
} from "@/hooks/useEvents";
import { useTutorial } from "@/contexts/TutorialContext";
import { adminTutorialSteps } from "@/config/tutorials";
import type { Event, CreateEventDto, UpdateEventDto } from "@/types";

export const AdminPage: React.FC = () => {
  // État local
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries et mutations
  const { data: events = [], isLoading, error } = useMyEvents();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const togglePublishMutation = useTogglePublishEvent();

  // Tutorial
  const { autoStartTutorial } = useTutorial();

  // Auto-démarrer le tutoriel à la première visite
  useEffect(() => {
    autoStartTutorial("admin", adminTutorialSteps);
  }, [autoStartTutorial]);

  // Filtrage et recherche
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Filtrer par statut
    if (activeFilter === "published") {
      filtered = filtered.filter((e) => e.published);
    } else if (activeFilter === "draft") {
      filtered = filtered.filter((e) => !e.published);
    }

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.slug.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query)
      );
    }

    // Trier par date (plus récent en premier)
    filtered.sort(
      (a, b) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    );

    return filtered;
  }, [events, activeFilter, searchQuery]);

  // Handlers
  const handleCreate = async (data: CreateEventDto) => {
    await createMutation.mutateAsync(data);
    setIsCreateModalOpen(false);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
  };

  const handleUpdate = async (data: UpdateEventDto) => {
    if (!editingEvent) return;
    await updateMutation.mutateAsync({ slug: editingEvent.slug, data });
    setEditingEvent(null);
  };

  const handleDelete = async (event: Event) => {
    await deleteMutation.mutateAsync(event.slug);
  };

  const handleTogglePublish = async (event: Event) => {
    await togglePublishMutation.mutateAsync({
      slug: event.slug,
      published: !event.published,
    });
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="admin" />

      <main className="container-custom py-8">
        {/* En-tête de page */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mes événements
          </h1>
          <p className="text-gray-600">
            Gérez vos événements sportifs et leurs zones de fermeture
          </p>
        </div>

        {/* Filtres et bouton création */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:max-w-md">
              <EventFilters
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              data-tutorial="create-event-btn"
            >
              <Plus size={20} />
              Créer un événement
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            Erreur lors du chargement des événements
          </div>
        )}

        {/* Liste des événements */}
        {!isLoading && !error && (
          <>
            {/* Compteur */}
            <div className="mb-4 text-sm text-gray-600">
              {filteredEvents.length} événement
              {filteredEvents.length > 1 ? "s" : ""}
              {searchQuery && " trouvé(s)"}
            </div>

            <EventList
              events={filteredEvents}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
            />
          </>
        )}
      </main>

      {/* Modal de création */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Créer un événement"
        size="lg"
      >
        <EventForm
          onSubmit={handleCreate}
          onCancel={handleCloseModals}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Modal d'édition */}
      <Modal
        isOpen={!!editingEvent}
        onClose={handleCloseModals}
        title="Modifier l'événement"
        size="lg"
      >
        {editingEvent && (
          <EventForm
            event={editingEvent}
            onSubmit={handleUpdate}
            onCancel={handleCloseModals}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
};
