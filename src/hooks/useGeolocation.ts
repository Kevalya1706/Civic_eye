import { useState, useCallback } from "react";

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string;
  loading: boolean;
  error: string | null;
  locked: boolean; // true when high-precision fix acquired
}

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    address: "Fetching location...",
    loading: false,
    error: null,
    locked: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo(prev => ({ ...prev, error: "Geolocation not supported", loading: false }));
      return;
    }

    setGeo(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy * 100) / 100;
        const locked = accuracy <= 10; // sub-10m = satellite lock

        // Reverse geocode
        let address = `${lat}° N, ${lng}° E`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            const parts = data.display_name.split(",").slice(0, 3).join(",").trim();
            address = parts;
          }
        } catch {
          // fallback to coords
        }

        setGeo({ lat, lng, accuracy, address, loading: false, error: null, locked });
      },
      (err) => {
        setGeo(prev => ({
          ...prev,
          loading: false,
          error: err.message || "Location access denied",
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number, address?: string) => {
    setGeo({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      accuracy: 0,
      address: address || `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`,
      loading: false,
      error: null,
      locked: true, // manual entry is trusted
    });
  }, []);

  return { ...geo, requestLocation, setManualLocation };
}
