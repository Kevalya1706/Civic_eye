import { useState, useCallback } from "react";

interface GeoState {
  lat: number | null;
  lng: number | null;
  address: string;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({
    lat: null,
    lng: null,
    address: "Fetching location...",
    loading: false,
    error: null,
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

        setGeo({ lat, lng, address, loading: false, error: null });
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
      address: address || `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`,
      loading: false,
      error: null,
    });
  }, []);

  return { ...geo, requestLocation, setManualLocation };
}
