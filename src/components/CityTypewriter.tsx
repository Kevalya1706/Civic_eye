import { useEffect, useRef, useState } from "react";

interface Props {
  city: string | null | undefined;
  loading?: boolean;
}

const FALLBACK = "Your City";
const TYPE_MS = 90;
const DELETE_MS = 55;
const HOLD_MS = 1200;

export default function CityTypewriter({ city }: Props) {
  const [display, setDisplay] = useState(FALLBACK);
  const lastTargetRef = useRef<string>(FALLBACK);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target =
      city && typeof city === "string" && city.trim().length > 0
        ? city.trim()
        : FALLBACK;

    if (target === lastTargetRef.current) return;
    lastTargetRef.current = target;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const typeIn = (current: string) => {
      if (current.length >= target.length) return;
      const next = target.slice(0, current.length + 1);
      setDisplay(next);
      timeoutRef.current = setTimeout(() => typeIn(next), TYPE_MS);
    };

    const deleteOut = (current: string) => {
      if (current.length === 0) {
        timeoutRef.current = setTimeout(() => typeIn(""), TYPE_MS);
        return;
      }
      const next = current.slice(0, -1);
      setDisplay(next);
      timeoutRef.current = setTimeout(() => deleteOut(next), DELETE_MS);
    };

    timeoutRef.current = setTimeout(() => {
      try {
        deleteOut(display);
      } catch {
        setDisplay(FALLBACK);
      }
    }, HOLD_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  return (
    <span
      className="inline-flex items-baseline align-baseline"
      style={{ color: "#1E293B" }}
    >
      <span>{display}</span>
      <span>,</span>
    </span>
  );
}
