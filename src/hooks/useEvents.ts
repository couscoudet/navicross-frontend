import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Event, CreateEventDto, UpdateEventDto } from "@/types";

// Query keys
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filter?: string) => [...eventKeys.lists(), { filter }] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (slug: string) => [...eventKeys.details(), slug] as const,
  my: () => [...eventKeys.all, "my"] as const,
};

// Hook pour récupérer tous les événements publics
export const useEvents = () => {
  return useQuery({
    queryKey: eventKeys.lists(),
    queryFn: api.events.getAll,
  });
};

// Hook pour récupérer mes événements
export const useMyEvents = () => {
  return useQuery({
    queryKey: eventKeys.my(),
    queryFn: api.events.getMy,
  });
};

// Hook pour récupérer un événement par slug
export const useEvent = (slug: string) => {
  return useQuery({
    queryKey: eventKeys.detail(slug),
    queryFn: () => api.events.getBySlug(slug),
    enabled: !!slug,
  });
};

// Hook pour créer un événement
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventDto) => api.events.create(data),
    onSuccess: () => {
      // Invalider les listes d'événements pour forcer un refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
};

// Hook pour mettre à jour un événement
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: UpdateEventDto }) =>
      api.events.update(slug, data),
    onSuccess: (updatedEvent) => {
      // Invalider les listes
      queryClient.invalidateQueries({ queryKey: eventKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      // Mettre à jour le cache du détail
      queryClient.setQueryData(
        eventKeys.detail(updatedEvent.slug),
        updatedEvent
      );
    },
  });
};

// Hook pour supprimer un événement
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => api.events.delete(slug),
    onSuccess: () => {
      // Invalider les listes
      queryClient.invalidateQueries({ queryKey: eventKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
};

// Hook pour publier/dépublier un événement
export const useTogglePublishEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, published }: { slug: string; published: boolean }) =>
      api.events.update(slug, { published }),
    onSuccess: (updatedEvent) => {
      // Invalider les listes
      queryClient.invalidateQueries({ queryKey: eventKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      // Mettre à jour le cache du détail
      queryClient.setQueryData(
        eventKeys.detail(updatedEvent.slug),
        updatedEvent
      );
    },
  });
};
