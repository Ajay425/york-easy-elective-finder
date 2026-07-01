import { useState, useMemo } from "react";
import { YEARS, DEPARTMENTS, DAY_LABELS } from "../lib/courseFilters";

// Author: --Jon

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function useFilters(courses, initialFilters = null, initialSearch = "") {
  const defaultFilters = {
    Credits: [],
    Year: [],
    Department: [],
    CourseType: [],
    Day: [],     // ✅ added
    StartTime: null,
    EndTime: null,
  };

  // Merge initialFilters with defaultFilters to handle old localStorage data
  const mergedFilters = initialFilters 
    ? { ...defaultFilters, ...initialFilters }
    : defaultFilters;

  const [filters, setFilters] = useState(mergedFilters);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Generate filter options from courses
  const filterOptions = useMemo(() => {
    const credits = Array.from(new Set(courses.map((c) => c.credits))).sort(
      (a, b) => parseFloat(a) - parseFloat(b)
    );

    const courseLevels = YEARS.filter((year) =>
      courses.some((c) => c.year === year)
    );

    const courseDepts = DEPARTMENTS.filter((dept) =>
      courses.some((c) => c.deptAcronym === dept)
    );

    const typeOrder = ["LECT", "SEMR", "TUTR", "LAB", "BLEN", "ONLN", "ONCA", "HYFX"];
    const foundTypes = new Set();
    courses.forEach((c) => {
      c.terms?.forEach((t) => {
        if (t.type) foundTypes.add(t.type);
        t.meetings?.forEach((m) => {
          if (m?.type) foundTypes.add(m.type);
        });
      });
    });
    const courseTypes = Array.from(foundTypes).sort((a, b) => {
      const ia = typeOrder.indexOf(a);
      const ib = typeOrder.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });

    // ✅ Day options derived from meetings.dayOfWeek or courseTimes.dayOfWeek
    const dayKeys = new Set();
    courses.forEach((c) => {
      c.terms?.forEach((t) => {
        // Check meetings for dayOfWeek
        t.meetings?.forEach((m) => {
          if (m?.dayOfWeek) dayKeys.add(m.dayOfWeek);
        });
        // Also check courseTimes for dayOfWeek
        t.courseTimes?.forEach((ct) => {
          if (ct?.dayOfWeek) dayKeys.add(ct.dayOfWeek);
        });
      });
    });

    const days = ["M", "T", "W", "R", "F", "S", "U"]
      .filter((d) => dayKeys.has(d))
      .map((d) => DAY_LABELS[d] || d);


    // Use a regular set of time options (30-minute increments) from 07:00 to 23:00
    const generateTimeOptions = (from = "07:00", to = "23:00", stepMins = 30) => {
      const s = timeToMinutes(from);
      const e = timeToMinutes(to);
      if (s == null || e == null || s >= e) return [];
      const out = [];
      for (let t = s; t <= e; t += stepMins) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
      return out;
    };

    const hasTimingData = courses.some((c) =>
      c.terms?.some((t) =>
        t.courseTimes?.some((ct) => ct?.startTime) ||
        t.meetings?.some((m) => m?.startTime)
      )
    );

    const startTimes = hasTimingData ? generateTimeOptions("07:00", "23:00", 30) : [];
    const endTimes = hasTimingData ? generateTimeOptions("07:00", "23:00", 30) : [];

    return {
      Credits: credits,
      Year: courseLevels,
      Department: courseDepts,
      CourseType: courseTypes,
      Day: days,
      StartTime: startTimes,
      EndTime: endTimes,
    };
  }, [courses]);

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    // For better UI behavior, filter at the term/section level and return
    // courses where at least one term matches the selected section-level filters.
    return courses
      .map((course) => {
        // helper: collect day labels for a term
        const termDays = (t) => {
          const days = new Set();
          t.meetings?.forEach((m) => {
            if (m?.dayOfWeek) days.add(DAY_LABELS[m.dayOfWeek] || m.dayOfWeek);
          });
          t.courseTimes?.forEach((ct) => {
            if (ct?.dayOfWeek) days.add(DAY_LABELS[ct.dayOfWeek] || ct.dayOfWeek);
          });
          return Array.from(days);
        };

        const termMatchesType = (t) => {
          if (filters.CourseType.length === 0) return true;
          if (t.type && filters.CourseType.includes(t.type)) return true;
          return t.meetings?.some((m) => m?.type && filters.CourseType.includes(m.type));
        };

        const termMatchesDay = (t) => {
          if (filters.Day.length === 0) return true;
          const days = termDays(t);
          if (days.length === 0) return false;
          // include term only if its set of days EXACTLY matches the selected set
          if (days.length !== filters.Day.length) return false;
          return filters.Day.every((sel) => days.includes(sel));
        };

        const termMatchesTiming = (t) => {
          // If no start/end filter selected, allow the term
          const selStart = filters.StartTime ? timeToMinutes(filters.StartTime) : null;
          const selEnd = filters.EndTime ? timeToMinutes(filters.EndTime) : null;
          if (selStart == null && selEnd == null) return true;

          // collect time ranges for this term
          const ranges = [];
          t.meetings?.forEach((m) => {
            const s = timeToMinutes(m?.startTime);
            let e = timeToMinutes(m?.endTime);
            if ((e == null || Number.isNaN(e)) && m?.durationMinutes && s != null) e = s + m.durationMinutes;
            if (s != null && e != null) ranges.push({ s, e });
          });
          t.courseTimes?.forEach((ct) => {
            const s = timeToMinutes(ct?.startTime);
            let e = timeToMinutes(ct?.endTime);
            if ((e == null || Number.isNaN(e)) && ct?.durationMinutes && s != null) e = s + ct.durationMinutes;
            if (s != null && e != null) ranges.push({ s, e });
          });

          if (ranges.length === 0) return false;

          // A term matches if any of its time ranges satisfy the selected constraints
          return ranges.some(({ s, e }) => {
            if (selStart != null && s < selStart) return false;
            if (selEnd != null && e > selEnd) return false;
            return true;
          });
        };

        // Build list of terms that match ALL section-level filters.
        // IMPORTANT: do NOT mutate or prune term objects — return the original term
        // if it contains any of the selected day(s). This preserves instructors and
        // other metadata attached to the term.
        const matchingTerms = (course.terms || []).filter((t) => {
          if (!termMatchesType(t) || !termMatchesDay(t) || !termMatchesTiming(t)) return false;
          // termMatchesDay already ensures the term has at least one selected day
          return true;
        });

        if (matchingTerms.length === 0) return null;

        // Return a shallow copy of course with only matching/pruned terms so UI shows only those section meetings
        return { ...course, terms: matchingTerms };
      })
      .filter(Boolean)
      .filter((course) => {
        // Apply remaining course-level filters
        const matchesSearch =
          searchQuery === "" ||
          (course.code || course.courseCode || "").toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
          (course.title || course.name || "").toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
          (course.faculty || "").toString().toLowerCase().includes(searchQuery.toLowerCase());

        const creditsOk =
          filters.Credits.length === 0 || filters.Credits.includes(course.credits || course.credit || course.credits);

        const yearOk = filters.Year.length === 0 || filters.Year.includes(course.year);

        const deptOk =
          filters.Department.length === 0 || filters.Department.includes(course.deptAcronym || course.dept);

        return matchesSearch && creditsOk && yearOk && deptOk;
      });
  }, [courses, filters, searchQuery]);

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  return {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filterOptions,
    filteredCourses,
    clearFilters,
  };
}
