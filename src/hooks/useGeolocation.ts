import { useState, useCallback, useRef, useEffect } from "react";

export type PrecisionTier = "high" | "standard" | "low";

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string;
  loading: boolean;
  error: string | null;
  locked: boolean;
  precisionTier: PrecisionTier;
  stableSeconds: number; // how long we've been in standard tier
}

function getTier(accuracy: number | null): PrecisionTier {
  if (accuracy === null) return "low";
  if (accuracy <= 10) return "high";
  if (accuracy <= 20) return "standard";
  return "low";
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
    precisionTier: "low",
    stableSeconds: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const stableTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableStartRef = useRef<number | null>(null);

  // Stability timer: counts seconds in standard tier
  useEffect(() => {
    if (geo.precisionTier === "standard" && !geo.locked) {
      if (!stableStartRef.current) {
        stableStartRef.current = Date.now();
      }
      stableTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (stableStartRef.current || Date.now())) / 1000);
        setGeo(prev => {
          const newLocked = elapsed >= 5;
          return { ...prev, stableSeconds: elapsed, locked: newLocked || prev.locked };
        });
      }, 1000);
    } else {
      stableStartRef.current = null;
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
    }
    return () => {
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
    };
  }, [geo.precisionTier, geo.locked]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo(prev => ({ ...prev, error: "Geolocation not supported", loading: false }));
      return;
    }

    setGeo(prev => ({ ...prev, loading: true, error: null, locked: false, stableSeconds: 0 }));
    stableStartRef.current = null;

    // Clear previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Use watchPosition for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy * 100) / 100;
        const tier = getTier(accuracy);
        const isHigh = tier === "high";

        // Reverse geocode
        let address = `${lat}° N, ${lng}° E`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            address = data.display_name.split(",").slice(0, 3).join(",").trim();
          }
        } catch {
          // fallback to coords
        }

        setGeo(prev => ({
          lat,
          lng,
          accuracy,
          address,
          loading: false,
          error: null,
          locked: isHigh || prev.locked,
          precisionTier: tier,
          stableSeconds: tier === "standard" ? prev.stableSeconds : 0,
        }));
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
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGeo({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      accuracy: 0,
      address: address || `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`,
      loading: false,
      error: null,
      locked: true,
      precisionTier: "high",
      stableSeconds: 0,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...geo, requestLocation, setManualLocation };
}
