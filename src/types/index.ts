// User types
export interface User {
  id: number;
  email: string;
  name: string;
  created_at?: string;
}

// Auth types
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  sessionId: string;
}

// Event types
export interface Event {
  id: number;
  slug: string;
  name: string;
  event_date: string;
  description?: string;
  route?: GeoJSON.LineString;
  published: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventDto {
  slug: string;
  name: string;
  event_date: string;
  description?: string;
  route?: GeoJSON.LineString;
}

export interface UpdateEventDto {
  name?: string;
  event_date?: string;
  description?: string;
  route?: GeoJSON.LineString;
  published?: boolean;
}

// Closure types
export type ClosureType = "barrier" | "segment" | "zone";

export interface Closure {
  id: number;
  event_id: number;
  name: string;
  type: ClosureType;
  polygon: GeoJSON.Polygon; // Point, LineString ou Polygon selon le type
  start_time: string;
  end_time: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClosureDto {
  name: string;
  type: ClosureType;
  polygon: GeoJSON.Geometry; // Backend attend "polygon"
  start_time: string;
  end_time: string;
  description?: string;
}

export interface UpdateClosureDto {
  name?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
}

// Route types
export interface CalculateRouteDto {
  origin: [number, number]; // [lng, lat]
  destination: [number, number]; // [lng, lat]
  profile: "driving" | "walking" | "cycling";
  eventSlug?: string;
}

export interface RouteResponse {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
  warnings?: string[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
}

// API Error types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
