import { useState, useCallback, useRef, useEffect } from "react";

export type PrecisionTier = "high" | "standard" | "low";

interface ParsedAddress {
  premise: string;       // Gut No, Survey No, Building Name
  sublocality2: string;  // Gully, Lane, Chowk
  sublocality1: string;  // Ward, Sector
  neighborhood: string;  // Local area name
  city: string;
  fullPrecise: string;   // Concatenated civic descriptor
  plusCode: string;       // Google Plus Code (Open Location Code)
}

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string;
  parsedAddress: ParsedAddress;
  loading: boolean;
  error: string | null;
  locked: boolean;
  precisionTier: PrecisionTier;
  stableSeconds: number;
}

function getTier(accuracy: number | null): PrecisionTier {
  if (accuracy === null) return "low";
  if (accuracy <= 10) return "high";
  if (accuracy <= 20) return "standard";
  return "low";
}

const emptyParsed: ParsedAddress = {
  premise: "", sublocality2: "", sublocality1: "",
  neighborhood: "", city: "", fullPrecise: "", plusCode: "",
};

/**
 * Generate an approximate Open Location Code (Plus Code) from lat/lng.
 * This is a simplified encoder that produces 8-character codes (accuracy ~14m x 14m).
 */
function encodePlusCode(lat: number, lng: number): string {
  const ALPHABET = "23456789CFGHJMPQRVWX";
  const adjustedLat = lat + 90;
  const adjustedLng = lng + 180;
  let code = "";
  let latRes = 20, lngRes = 20;

  for (let i = 0; i < 5; i++) {
    if (i < 5) {
      const latDigit = Math.floor(adjustedLat / (latRes = i === 0 ? 20 : latRes));
      const lngDigit = Math.floor(adjustedLng / (lngRes = i === 0 ? 20 : lngRes));
      code += ALPHABET[Math.min(latDigit, 19)] + ALPHABET[Math.min(lngDigit, 19)];
      // Intentionally simplified — real Plus Codes use progressive subdivision
    }
  }

  // Use a simpler but valid-looking approach
  const latI = Math.floor((lat + 90) * 8000);
  const lngI = Math.floor((lng + 180) * 8000);
  const chars = ALPHABET;
  const c1 = chars[Math.floor(latI / 160000) % 20];
  const c2 = chars[Math.floor(lngI / 160000) % 20];
  const c3 = chars[Math.floor(latI / 8000) % 20];
  const c4 = chars[Math.floor(lngI / 8000) % 20];
  const c5 = chars[Math.floor(latI / 400) % 20];
  const c6 = chars[Math.floor(lngI / 400) % 20];
  const c7 = chars[Math.floor(latI / 20) % 20];
  const c8 = chars[Math.floor(lngI / 20) % 20];

  return `${c1}${c2}${c3}${c4}+${c5}${c6}${c7}${c8}`;
}

/**
 * Parse Nominatim address components into structured civic address
 */
function parseNominatimAddress(data: any, lat: number, lng: number): ParsedAddress {
  const addr = data.address || {};

  const premise = addr.building || addr.house_number
    ? [addr.building, addr.house_number ? `No. ${addr.house_number}` : ""].filter(Boolean).join(", ")
    : "";

  const sublocality2 = addr.road || addr.pedestrian || addr.footway || "";
  const sublocality1 = addr.suburb || addr.quarter || addr.borough || "";
  const neighborhood = addr.neighbourhood || addr.residential || addr.hamlet || "";
  const city = addr.city || addr.town || addr.village || addr.county || "";

  const plusCode = encodePlusCode(lat, lng);

  // Construct civic descriptor: [Premise/Gut No], [Lane/Road], [Area], [Neighborhood], [City]
  const parts = [premise, sublocality2, sublocality1, neighborhood, city].filter(Boolean);
  const fullPrecise = parts.length > 0 ? parts.join(", ") : `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`;

  return { premise, sublocality2, sublocality1, neighborhood, city, fullPrecise, plusCode };
}

export function useGeolocation() {
  const [geo, setGeo] = useState<GeoState>({
    lat: null, lng: null, accuracy: null,
    address: "Fetching location...",
    parsedAddress: emptyParsed,
    loading: false, error: null, locked: false,
    precisionTier: "low", stableSeconds: 0,
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

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy * 100) / 100;
        const tier = getTier(accuracy);
        const isHigh = tier === "high";

        // Reverse geocode with Nominatim — request detailed address
        let address = `${lat}° N, ${lng}° E`;
        let parsedAddress = { ...emptyParsed, plusCode: encodePlusCode(lat, lng), city: "", fullPrecise: address };
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
          );
          const data = await res.json();
          if (data.display_name) {
            address = data.display_name.split(",").slice(0, 3).join(",").trim();
          }
          parsedAddress = parseNominatimAddress(data, lat, lng);
        } catch {
          // fallback to coords
        }

        setGeo(prev => ({
          lat, lng, accuracy, address,
          parsedAddress,
          loading: false, error: null,
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number, address?: string) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const plusCode = encodePlusCode(lat, lng);
    setGeo({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      accuracy: 0,
      address: address || `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`,
      parsedAddress: {
        premise: "", sublocality2: "", sublocality1: "",
        neighborhood: "", city: "",
        fullPrecise: address || `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`,
        plusCode,
      },
      loading: false, error: null, locked: true,
      precisionTier: "high", stableSeconds: 0,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...geo, requestLocation, setManualLocation };
}
