import { useState, useEffect } from "react";

// Module-level cache so we only fetch once per page load
// null = loading; { seats: {}, generatedAt: string|null } = loaded
let _cache = null;
let _promise = null;

/**
 * Returns { seats, generatedAt } loaded from /data/seats.json.
 * Returns null while loading.
 */
export function useSeats() {
  const [data, setData] = useState(_cache);

  useEffect(() => {
    if (_cache !== null) {
      setData(_cache);
      return;
    }

    if (!_promise) {
      _promise = fetch("/data/seats.json")
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          _cache = { seats: json?.seats ?? {}, generatedAt: json?.generatedAt ?? null };
          return _cache;
        })
        .catch(() => {
          _cache = { seats: {}, generatedAt: null };
          return _cache;
        });
    }

    _promise.then((d) => setData(d));
  }, []);

  return data; // null = loading; { seats, generatedAt } = loaded
}

/**
 * Extracts individual CAT codes from a possibly compound CAT string.
 * e.g. "A71B02 (AP PRWR) F28S02 (AP EN )" → ["A71B02", "F28S02"]
 * Simple codes like "N95N01" → ["N95N01"]
 */
function parseCatCodes(catNumber) {
  // CAT codes are 6-char alphanumeric tokens: letter + 2 digits + letter + 2 digits
  const matches = catNumber.match(/\b[A-Z][0-9]{2}[A-Z][0-9]{2}\b/g);
  return matches ?? [catNumber];
}

/**
 * Returns the open seat count for a given CAT number, or null if not available.
 * Handles compound CAT strings (cross-listed sections) by returning the minimum
 * open seats across all component CAT codes.
 */
export function getOpenSeats(seats, catNumber) {
  if (!seats || !catNumber) return null;

  // Fast path: exact match
  if (typeof seats[catNumber] === "number") return seats[catNumber];

  // Compound CAT: extract individual codes and return the minimum
  const codes = parseCatCodes(catNumber);
  if (codes.length <= 1) return null; // single code, not in seats

  let min = null;
  for (const code of codes) {
    const v = seats[code];
    if (typeof v === "number") {
      min = min === null ? v : Math.min(min, v);
    }
  }
  return min;
}

/** Formats a seats.json generatedAt ISO string into a readable local time. */
export function formatSeatTimestamp(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Toronto",
  });
}
