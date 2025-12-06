import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle } from "lucide-react";
import type { CreateEventDto, UpdateEventDto, Event } from "@/types";
import { slugify } from "@/utils/string-utils";

// Props pour le mode création (pas d'event fourni)
interface CreateEventFormProps {
  event?: never;
  initialData?: never;
  onSubmit: (data: CreateEventDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Props pour le mode édition (event ou initialData fourni)
interface EditEventFormProps {
  event?: Event;
  initialData?: Event;
  onSubmit: (data: UpdateEventDto) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Union des deux types
type EventFormProps = CreateEventFormProps | EditEventFormProps;

export const EventForm: React.FC<EventFormProps> = (props) => {
  const { onSubmit, onCancel, isLoading: externalLoading } = props;

  // Détection automatique du mode
  const eventData =
    "event" in props
      ? props.event
      : "initialData" in props
      ? props.initialData
      : null;
  const isEditMode = !!eventData;

  const [formData, setFormData] = useState({
    name: eventData?.name || "",
    event_date: eventData?.event_date
      ? new Date(eventData.event_date).toISOString().slice(0, 16)
      : "",
    description: eventData?.description || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Utiliser le loading externe si fourni, sinon le state interne
  const isLoading = externalLoading ?? loading;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = "Le nom est requis";
    }

    if (!formData.event_date) {
      newErrors.event_date = "La date est requise";
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

    setLoading(true);
    setApiError(null);

    try {
      if (isEditMode) {
        // Mode édition
        const updateData: UpdateEventDto = {
          name: formData.name,
          event_date: new Date(formData.event_date).toISOString(),
          description: formData.description || undefined,
        };
        await (onSubmit as (data: UpdateEventDto) => Promise<void>)(updateData);
      } else {
        // Mode création - génération automatique du slug
        const createData: CreateEventDto = {
          slug: slugify(formData.name),
          name: formData.name,
          event_date: new Date(formData.event_date).toISOString(),
          description: formData.description || undefined,
        };
        await (onSubmit as (data: CreateEventDto) => Promise<void>)(createData);
      }
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {/* Nom */}
        <Input
          label="Nom de l'événement"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Marathon de Paris 2025"
          disabled={isLoading}
        />

        {/* Date */}
        <Input
          label="Date de l'événement"
          type="datetime-local"
          name="event_date"
          value={formData.event_date}
          onChange={handleChange}
          error={errors.event_date}
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
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded text-base text-gray-900 placeholder:text-gray-400 transition-all duration-fast focus:outline-none focus:border-primary focus:shadow-focus disabled:bg-gray-100"
            placeholder="Description de l'événement..."
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Erreur API */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={isLoading} fullWidth>
          {isEditMode ? "Enregistrer" : "Créer l'événement"}
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
