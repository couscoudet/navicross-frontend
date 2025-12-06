import { useState } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeolocationState {
  position: Coordinates | null;
  error: string | null;
  loading: boolean;
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
            position: coords,
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

  const watchPosition = (callback: (position: Coordinates) => void) => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return null;
    }

    console.log("Starting watchPosition...");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        console.log("WatchPosition success:", coords);
        setState({
          position: coords,
          error: null,
          loading: false,
        });
        callback(coords);
      },
      (error) => {
        console.error("Watch position error:", error.code, error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    console.log("WatchPosition started, ID:", watchId);
    return watchId;
  };

  const clearWatch = (watchId: number) => {
    navigator.geolocation.clearWatch(watchId);
  };

  return {
    ...state,
    getCurrentPosition,
    watchPosition,
    clearWatch,
  };
};
