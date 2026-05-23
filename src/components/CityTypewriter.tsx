import { useEffect, useRef, useState } from "react";

interface Props {
  city: string | null | undefined;
  loading?: boolean;
}

const FALLBACK = "Your City";
const TYPE_MS = 90;
const DELETE_MS = 55;
const HOLD_MS = 1000;

export default function CityTypewriter({ city, loading }: Props) {
  const [display, setDisplay] = useState("");
  const lastTargetRef = useRef<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target =
      city && typeof city === "string" && city.trim().length > 0
        ? city.trim()
        : FALLBACK;

    if (target === lastTargetRef.current) return;
    lastTargetRef.current = target;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const run = (current: string) => {
      // Delete phase
      if (current.length > 0 && !target.startsWith(current)) {
        setDisplay(current.slice(0, -1));
        timeoutRef.current = setTimeout(() => run(current.slice(0, -1)), DELETE_MS);
        return;
      }
      // Type phase
      if (current.length < target.length) {
        const next = target.slice(0, current.length + 1);
        setDisplay(next);
        timeoutRef.current = setTimeout(() => run(next), TYPE_MS);
        return;
      }
    };

    // If we already have content, hold briefly before swap (only when target changed mid-flight)
    if (display.length > 0 && display !== target) {
      timeoutRef.current = setTimeout(() => run(display), HOLD_MS);
    } else {
      run(display);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  return (
    <span className="relative inline-block">
      <span style={{ color: "#1E293B" }}>{display || "\u00A0"}</span>
      <span
        aria-hidden
        className="inline-block ml-1 animate-pulse"
        style={{ color: "#A3E635" }}
      >
        |
      </span>
    </span>
  );
}
