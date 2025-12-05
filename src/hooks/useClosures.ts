import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Closure, CreateClosureDto, UpdateClosureDto } from "@/types";

export const useClosures = (eventSlug: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["closures", eventSlug];

  // Récupérer les closures
  const {
    data: closures = [],
    isLoading,
    error,
  } = useQuery<Closure[]>({
    queryKey,
    queryFn: () => api.closures.getByEvent(eventSlug),
    enabled: !!eventSlug,
  });

  // Créer une closure
  const createMutation = useMutation({
    mutationFn: (data: CreateClosureDto) =>
      api.closures.create(eventSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Modifier une closure
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClosureDto }) =>
      api.closures.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Supprimer une closure
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.closures.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    closures,
    isLoading,
    error,
    createClosure: createMutation.mutateAsync,
    updateClosure: updateMutation.mutateAsync,
    deleteClosure: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
