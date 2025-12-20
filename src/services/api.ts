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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Callback pour logout automatique (sera défini par AuthContext)
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorized = callback;
};

// ✅ Intercepteur response : déconnexion auto sur 401/403
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Session expirée ou invalide
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn("⚠️ Session expirée, déconnexion automatique");
      onUnauthorized?.();
    }

    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const api = {
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

    // ✅ Vérifier la session backend (à appeler au boot)
    checkSession: async (): Promise<{ user: AuthResponse["user"] } | null> => {
      try {
        const response = await client.get<{ user: AuthResponse["user"] }>(
          "/auth/me"
        );
        return response.data;
      } catch {
        return null;
      }
    },
  },

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

  route: {
    calculate: async (data: CalculateRouteDto): Promise<RouteResponse> => {
      const response = await client.post<RouteResponse>("/route", data);
      return response.data;
    },
  },
};

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
