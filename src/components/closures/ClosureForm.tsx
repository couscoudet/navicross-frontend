import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle } from "lucide-react";
import { convertToPolygon } from "@/utils/geometryHelpers";
import type { CreateClosureDto, UpdateClosureDto, Closure } from "@/types";

interface ClosureFormProps {
  geometry: GeoJSON.Geometry;
  type: "barrier" | "segment" | "zone";
  initialData?: Closure;
  onSubmit: (data: CreateClosureDto | UpdateClosureDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  eventDate: string; // Date de l'événement
  existingCount: number; // Nombre de closures existantes
}

export const ClosureForm: React.FC<ClosureFormProps> = ({
  geometry,
  type,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  eventDate,
  existingCount,
}) => {
  const isEditMode = !!initialData;

  // Valeurs par défaut
  const defaultName = useMemo(() => {
    if (initialData?.name) return initialData.name;
    const typeLabels = { barrier: "Barrage", segment: "Tronçon", zone: "Zone" };
    return `${typeLabels[type]} ${existingCount + 1}`;
  }, [initialData?.name, type, existingCount]);

  const defaultStartTime = useMemo(() => {
    if (initialData) {
      return format(new Date(initialData.start_time), "yyyy-MM-dd'T'HH:mm");
    }
    // Date de l'événement à 00:01
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 1, 0, 0);
    return format(eventDay, "yyyy-MM-dd'T'HH:mm");
  }, [initialData, eventDate]);

  const defaultEndTime = useMemo(() => {
    if (initialData) {
      return format(new Date(initialData.end_time), "yyyy-MM-dd'T'HH:mm");
    }
    // Date de l'événement à 23:59
    const eventDay = new Date(eventDate);
    eventDay.setHours(23, 59, 0, 0);
    return format(eventDay, "yyyy-MM-dd'T'HH:mm");
  }, [initialData, eventDate]);

  const [formData, setFormData] = useState({
    name: defaultName,
    start_time: defaultStartTime,
    end_time: defaultEndTime,
    description: initialData?.description || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const typeLabels = {
    barrier: "Barrage",
    segment: "Tronçon",
    zone: "Zone",
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "Le nom est requis";
    }

    if (!formData.start_time) {
      newErrors.start_time = "L'heure de début est requise";
    }

    if (!formData.end_time) {
      newErrors.end_time = "L'heure de fin est requise";
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        newErrors.end_time = "L'heure de fin doit être après l'heure de début";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) {
      setApiError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isEditMode) {
        const updateData: UpdateClosureDto = {
          name: formData.name,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          description: formData.description || undefined,
        };
        await onSubmit(updateData);
      } else {
        const polygon = convertToPolygon(geometry, type);

        const createData: CreateClosureDto = {
          name: formData.name,
          type,
          polygon,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          description: formData.description || undefined,
        };
        await onSubmit(createData);
      }
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Erreur lors de la sauvegarde"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {/* Type (lecture seule) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type de fermeture
          </label>
          <div className="px-4 py-3 bg-gray-50 rounded text-gray-700 font-medium">
            {typeLabels[type]}
          </div>
        </div>

        {/* Nom avec valeur par défaut */}
        <Input
          label="Nom"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder={defaultName}
          disabled={isLoading}
        />

        {/* Horaires avec valeurs par défaut */}
        <Input
          label="Début"
          type="datetime-local"
          name="start_time"
          value={formData.start_time}
          onChange={handleChange}
          error={errors.start_time}
          disabled={isLoading}
        />

        <Input
          label="Fin"
          type="datetime-local"
          name="end_time"
          value={formData.end_time}
          onChange={handleChange}
          error={errors.end_time}
          disabled={isLoading}
        />

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description (optionnel)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded text-base text-gray-900 placeholder:text-gray-400 transition-all duration-fast focus:outline-none focus:border-primary focus:shadow-focus disabled:bg-gray-100"
            placeholder="Informations complémentaires..."
            disabled={isLoading}
          />
        </div>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={isLoading} fullWidth>
          {isEditMode ? "Enregistrer" : "Créer"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
};
