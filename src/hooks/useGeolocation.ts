import { useState, useCallback } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface EnrichedPosition extends Coordinates {
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface GeolocationState {
  position: EnrichedPosition | null;
  error: string | null;
  loading: boolean;
}

interface WatchPositionOptions {
  minAccuracy?: number; // Ignorer positions > X mètres
  minDistance?: number; // Ignorer mouvements < X mètres
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
  });

  const getCurrentPosition = (): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setState({
          position: null,
          error: "La géolocalisation n'est pas supportée par votre navigateur",
          loading: false,
        });
        resolve(null);
        return;
      }

      setState({ position: null, error: null, loading: true });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setState({
            position: {
              ...coords,
              accuracy: position.coords.accuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp,
            },
            error: null,
            loading: false,
          });
          resolve(coords);
        },
        (error) => {
          let errorMessage = "Erreur de géolocalisation";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permission de géolocalisation refusée";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Position indisponible";
              break;
            case error.TIMEOUT:
              errorMessage = "Délai de géolocalisation dépassé";
              break;
          }
          setState({
            position: null,
            error: errorMessage,
            loading: false,
          });
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // ✅ AMÉLIORATIONS: Ajout des filtres et infos enrichies
  const watchPosition = useCallback(
    (
      callback: (position: EnrichedPosition) => void,
      options: WatchPositionOptions = {}
    ) => {
      if (!navigator.geolocation) {
        console.error("Geolocation not supported");
        return null;
      }

      const { minAccuracy = 50, minDistance = 5 } = options;
      let lastPosition: EnrichedPosition | null = null;

      console.log("Starting watchPosition with filters:", {
        minAccuracy,
        minDistance,
      });

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading, speed } =
            position.coords;

          // ✅ Filtrer les positions peu précises
          if (accuracy > minAccuracy) {
            console.warn(
              `Position ignorée: précision ${accuracy.toFixed(
                0
              )}m > ${minAccuracy}m`
            );
            return;
          }

          const enrichedPosition: EnrichedPosition = {
            lat: latitude,
            lng: longitude,
            accuracy,
            heading: heading ?? null,
            speed: speed ?? null,
            timestamp: position.timestamp,
          };

          // ✅ Filtrer les micro-mouvements
          if (lastPosition && minDistance > 0) {
            const distance = calculateDistance(
              lastPosition.lat,
              lastPosition.lng,
              latitude,
              longitude
            );

            if (distance < minDistance) {
              console.log(
                `Mouvement ignoré: ${distance.toFixed(1)}m < ${minDistance}m`
              );
              return;
            }
          }

          lastPosition = enrichedPosition;

          console.log("WatchPosition update:", {
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            accuracy: `${accuracy.toFixed(0)}m`,
            heading: heading ? `${heading.toFixed(0)}°` : null,
            speed: speed ? `${(speed * 3.6).toFixed(1)}km/h` : null,
          });

          setState({
            position: enrichedPosition,
            error: null,
            loading: false,
          });

          callback(enrichedPosition);
        },
        (error) => {
          console.error("Watch position error:", error.code, error.message);
          let errorMessage = "Erreur de suivi GPS";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permission GPS refusée";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Position GPS indisponible";
              break;
            case error.TIMEOUT:
              errorMessage = "Timeout GPS";
              break;
          }
          setState({
            position: null,
            error: errorMessage,
            loading: false,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // ✅ Augmenté de 5000 à 10000
          maximumAge: 0,
        }
      );

      console.log("WatchPosition started, ID:", watchId);
      return watchId;
    },
    []
  );

  const clearWatch = useCallback((watchId: number) => {
    console.log("Clearing watch:", watchId);
    navigator.geolocation.clearWatch(watchId);
  }, []);

  return {
    ...state,
    getCurrentPosition,
    watchPosition,
    clearWatch,
  };
};

// Helper: Calculer distance entre 2 points GPS
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Rayon terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
