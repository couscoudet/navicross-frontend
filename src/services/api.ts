import axios, { AxiosError } from "axios";
import type {
  RegisterDto,
  LoginDto,
  AuthResponse,
  Event,
  CreateEventDto,
  UpdateEventDto,
  Closure,
  CreateClosureDto,
  UpdateClosureDto,
  CalculateRouteDto,
  RouteResponse,
  ApiError,
} from "@/types";

// Configuration de base
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important pour envoyer automatiquement les cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Pas d'intercepteur request - les cookies sont envoyés automatiquement

// Intercepteur pour gérer les erreurs globalement
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Log des erreurs pour debug
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API client
export const api = {
  // Auth endpoints
  auth: {
    register: async (data: RegisterDto): Promise<AuthResponse> => {
      const response = await client.post<AuthResponse>("/auth/register", data);
      return response.data;
    },

    login: async (data: LoginDto): Promise<AuthResponse> => {
      const response = await client.post<AuthResponse>("/auth/login", data);
      return response.data;
    },

    logout: async (): Promise<void> => {
      await client.post("/auth/logout");
    },

    // Vérifier si l'utilisateur est connecté (utile au chargement de l'app)
    checkSession: async (): Promise<{ user: AuthResponse["user"] } | null> => {
      try {
        // Endpoint à implémenter dans le backend si nécessaire
        // Pour l'instant on peut utiliser GET /events/me qui requiert auth
        const response = await client.get("/events/me");
        if (response.status === 200) {
          // L'utilisateur est connecté, mais on n'a pas ses infos ici
          // Il faudra les stocker en localStorage après login/register
          return null;
        }
        return null;
      } catch {
        return null;
      }
    },
  },

  // Events endpoints
  events: {
    getAll: async (): Promise<Event[]> => {
      const response = await client.get<Event[]>("/events");
      return response.data;
    },

    getMy: async (): Promise<Event[]> => {
      const response = await client.get<Event[]>("/events/me");
      return response.data;
    },

    getBySlug: async (slug: string): Promise<Event> => {
      const response = await client.get<Event>(`/events/${slug}`);
      return response.data;
    },

    create: async (data: CreateEventDto): Promise<Event> => {
      const response = await client.post<Event>("/events", data);
      return response.data;
    },

    update: async (slug: string, data: UpdateEventDto): Promise<Event> => {
      const response = await client.patch<Event>(`/events/${slug}`, data);
      return response.data;
    },

    delete: async (slug: string): Promise<void> => {
      await client.delete(`/events/${slug}`);
    },
  },

  // Closures endpoints
  closures: {
    getByEvent: async (slug: string): Promise<Closure[]> => {
      const response = await client.get<Closure[]>(`/events/${slug}/closures`);
      return response.data;
    },

    getActive: async (slug: string): Promise<Closure[]> => {
      const response = await client.get<Closure[]>(
        `/events/${slug}/closures/active`
      );
      return response.data;
    },

    create: async (slug: string, data: CreateClosureDto): Promise<Closure> => {
      const response = await client.post<Closure>(
        `/events/${slug}/closures`,
        data
      );
      return response.data;
    },

    update: async (id: number, data: UpdateClosureDto): Promise<Closure> => {
      const response = await client.patch<Closure>(`/closures/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<void> => {
      await client.delete(`/closures/${id}`);
    },
  },

  // Route endpoint
  route: {
    calculate: async (data: CalculateRouteDto): Promise<RouteResponse> => {
      const response = await client.post<RouteResponse>("/route", data);
      return response.data;
    },
  },
};

// Helper pour extraire les messages d'erreur
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inconnue est survenue";
};
