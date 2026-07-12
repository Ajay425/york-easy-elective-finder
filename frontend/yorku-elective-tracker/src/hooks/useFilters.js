import { useEffect, useState, useMemo } from "react";
import { YEARS, COURSE_TYPES, DAY_LABELS } from "../lib/courseFilters";
import {
  DAY_ORDER,
  getDayLabelsForOffering,
  offeringMatchesDayTimeFilters,
  timeToMinutes,
} from "../lib/dayTimeFilters";

// Author: --Jon

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

    const courseDepts = Array.from(
      new Set(courses.map((c) => c.deptAcronym || c.dept).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const foundTypes = new Set();
    courses.forEach((c) => {
      c.terms?.forEach((t) => {
        if (t.type) foundTypes.add(t.type);
        t.meetings?.forEach((m) => {
          if (m?.type) foundTypes.add(m.type);
        });
        t.courseTimes?.forEach((ct) => {
          if (ct?.type) foundTypes.add(ct.type);
        });
      });
    });
    const courseTypes = Array.from(foundTypes).sort((a, b) => {
      const ia = COURSE_TYPES.indexOf(a);
      const ib = COURSE_TYPES.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });

    // Day options derived from the selected term's real schedule data.
    const dayKeys = new Set();
    courses.forEach((c) => {
      c.terms?.forEach((t) => {
        getDayLabelsForOffering(t).forEach((label) => dayKeys.add(label));
      });
    });

    const days = DAY_ORDER
      .map((key) => DAY_LABELS[key])
      .filter((label) => dayKeys.has(label));

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

  useEffect(() => {
    if (courses.length === 0) return;

    setFilters((current) => {
      const next = { ...current };
      let changed = false;

      ["Credits", "Year", "Department", "CourseType", "Day"].forEach((key) => {
        const values = Array.isArray(next[key]) ? next[key] : [];
        const allowed = new Set(filterOptions[key] || []);
        const validValues = values.filter((value) => allowed.has(value));

        if (validValues.length !== values.length) {
          next[key] = validValues;
          changed = true;
        }
      });

      ["StartTime", "EndTime"].forEach((key) => {
        if (next[key] != null && !(filterOptions[key] || []).includes(next[key])) {
          next[key] = null;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [courses.length, filterOptions]);

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    // For better UI behavior, filter at the term/section level and return
    // courses where at least one term matches the selected section-level filters.
    return courses
      .map((course) => {
        const termMatchesType = (t) => {
          if (filters.CourseType.length === 0) return true;
          if (t.type && filters.CourseType.includes(t.type)) return true;
          if (t.meetings?.some((m) => m?.type && filters.CourseType.includes(m.type))) return true;
          return t.courseTimes?.some((ct) => ct?.type && filters.CourseType.includes(ct.type));
        };

        const termMatchesSchedule = (t) =>
          offeringMatchesDayTimeFilters(t, {
            days: filters.Day,
            startTime: filters.StartTime,
            endTime: filters.EndTime,
          });

        // Build list of terms that match ALL section-level filters.
        // IMPORTANT: do NOT mutate or prune term objects — return the original term
        // so instructors and other metadata attached to the term stay intact.
        const matchingTerms = (course.terms || []).filter((t) => {
          return termMatchesType(t) && termMatchesSchedule(t);
        });

        if (matchingTerms.length === 0) return null;

        // Keep full availability for detail views while preserving filtered terms for cards/results.
        return { ...course, allTerms: course.allTerms || course.terms || [], terms: matchingTerms };
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
