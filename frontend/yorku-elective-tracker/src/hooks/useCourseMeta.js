import { useEffect, useState } from "react";
import { TERMS, TERM_LABELS } from "../lib/courseFilters";

const fallbackTerms = TERMS.map((term) => ({
  term,
  label: TERM_LABELS[term] || term,
}));

export function useCourseMeta() {
  const [meta, setMeta] = useState({
    termAndYear: null,
    terms: fallbackTerms,
    courseCount: null,
    hasTimingData: false,
    stats: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    fetch("/data/course_meta.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch course metadata");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const terms = Array.isArray(data.terms) && data.terms.length
          ? data.terms
          : fallbackTerms;

        setMeta({
          termAndYear: data.termAndYear || null,
          terms,
          courseCount: data.courseCount ?? null,
          hasTimingData: data.hasTimingData === true,
          stats: data.stats || null,
          loading: false,
        });
      })
      .catch(() => {
        if (!active) return;
        setMeta((current) => ({ ...current, loading: false }));
      });

    return () => {
      active = false;
    };
  }, []);

  return meta;
}
