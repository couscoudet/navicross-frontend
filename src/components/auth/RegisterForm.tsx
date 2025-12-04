import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, CheckCircle } from "lucide-react";

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validation côté client
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email
    if (!formData.email) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }

    // Password
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 6) {
      newErrors.password = "Minimum 6 caractères";
    } else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = "Doit contenir 1 majuscule et 1 chiffre";
    }

    // Name
    if (!formData.name) {
      newErrors.name = "Le nom est requis";
    } else if (formData.name.length < 2) {
      newErrors.name = "Minimum 2 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Effacer l'erreur API
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
      await register(formData);
      setSuccess(true);
      // Attendre un peu pour montrer le message de succès
      setTimeout(() => {
        onSuccess?.();
      }, 1000);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="slide-up bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg flex items-center gap-3">
        <CheckCircle size={24} />
        <div>
          <p className="font-semibold">Inscription réussie !</p>
          <p className="text-sm">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <Input
          label="Nom complet"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="John Doe"
          disabled={loading}
          autoComplete="name"
        />

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="user@example.com"
          disabled={loading}
          autoComplete="email"
        />

        <Input
          label="Mot de passe"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Minimum 6 caractères"
          helperText="Doit contenir au moins 1 majuscule et 1 chiffre"
          disabled={loading}
          autoComplete="new-password"
        />
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{apiError}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        loading={loading}
      >
        Créer mon compte
      </Button>
    </form>
  );
};
