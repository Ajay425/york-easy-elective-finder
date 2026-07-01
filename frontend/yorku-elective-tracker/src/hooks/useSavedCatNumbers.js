import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "savedCatNumbers_v1";

export function getCatEntryId(courseCode, offering) {
  return [
    courseCode,
    offering?.term,
    offering?.section,
    offering?.catNumber,
  ].map((part) => String(part || "").trim()).join("|");
}

function readSavedEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.id && entry?.catNumber) : [];
  } catch {
    return [];
  }
}

function writeSavedEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function buildSavedEntry(course, offering, termLabel, termAndYear) {
  const id = getCatEntryId(course?.code, offering);

  return {
    id,
    catNumber: offering.catNumber,
    courseCode: course.code,
    courseTitle: course.title,
    credits: course.credits,
    faculty: course.faculty,
    term: offering.term,
    termLabel: termLabel || offering.term,
    termAndYear: termAndYear || null,
    section: offering.section,
    savedAt: new Date().toISOString(),
  };
}

export function useSavedCatNumbers() {
  const [savedEntries, setSavedEntries] = useState(() => readSavedEntries());

  useEffect(() => {
    writeSavedEntries(savedEntries);
  }, [savedEntries]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        setSavedEntries(readSavedEntries());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const savedIds = useMemo(
    () => new Set(savedEntries.map((entry) => entry.id)),
    [savedEntries]
  );

  const saveCatNumber = useCallback((course, offering, termLabel, termAndYear) => {
    if (!course?.code || !offering?.catNumber) return;

    const entry = buildSavedEntry(course, offering, termLabel, termAndYear);
    setSavedEntries((current) => {
      if (current.some((item) => item.id === entry.id)) return current;
      return [entry, ...current];
    });
  }, []);

  const removeCatNumber = useCallback((id) => {
    setSavedEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearSavedCatNumbers = useCallback(() => {
    setSavedEntries([]);
  }, []);

  return {
    savedEntries,
    savedIds,
    saveCatNumber,
    removeCatNumber,
    clearSavedCatNumbers,
  };
}
