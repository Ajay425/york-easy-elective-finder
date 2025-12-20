import { useState, useMemo } from "react";
import { YEARS, DEPARTMENTS, COURSE_TYPES, DAY_LABELS, TIME_BUCKETS } from "../lib/courseFilters";

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

    const courseTypes = COURSE_TYPES.filter((type) =>
      courses.some((c) =>
        c.terms?.some((t) => t.meetings?.some((m) => m.type === type))
      )
    );

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

    // ✅ Start Time and End Time options - collect all unique times from meetings and courseTimes
    const timeSet = new Set();
    courses.forEach((c) => {
      c.terms?.forEach((t) => {
        // Check meetings for startTime
        t.meetings?.forEach((m) => {
          if (m?.startTime) timeSet.add(m.startTime);
        });
        // Also check courseTimes for startTime
        t.courseTimes?.forEach((ct) => {
          if (ct?.startTime) timeSet.add(ct.startTime);
        });
      });
    });

    // Convert times to array and sort them
    const timeSlots = Array.from(timeSet).sort((a, b) => {
      const aMin = timeToMinutes(a);
      const bMin = timeToMinutes(b);
      return (aMin ?? 999999) - (bMin ?? 999999);
    });

    return {
      Credits: credits,
      Year: courseLevels,
      Department: courseDepts,
      CourseType: courseTypes,
      Day: days,     // ✅ added
      StartTime: timeSlots,
      EndTime: timeSlots,
    };
  }, [courses]);

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        searchQuery === "" ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.faculty.toLowerCase().includes(searchQuery.toLowerCase());

      const hasMatchingType =
        filters.CourseType.length === 0 ||
        course.terms?.some((t) =>
          t.meetings?.some((m) => filters.CourseType.includes(m.type))
        );

      // ✅ Day filter
      const hasMatchingDay =
        filters.Day.length === 0 ||
        course.terms?.some((t) => {
          // Check meetings for dayOfWeek
          const hasDayInMeetings = t.meetings?.some((m) => {
            const label = DAY_LABELS[m?.dayOfWeek] || m?.dayOfWeek;
            return label && filters.Day.includes(label);
          });
          // Also check courseTimes for dayOfWeek
          const hasDayInCourseTimes = t.courseTimes?.some((ct) => {
            const label = DAY_LABELS[ct?.dayOfWeek] || ct?.dayOfWeek;
            return label && filters.Day.includes(label);
          });
          return hasDayInMeetings || hasDayInCourseTimes;
        });

      // ✅ Start Time filter - classes must start at or after the selected time
      const hasMatchingStartTime =
        filters.StartTime === null ||
        course.terms?.some((t) => {
          // Check meetings for startTime
          const hasStartInMeetings = t.meetings?.some((m) => {
            const classMin = timeToMinutes(m?.startTime);
            const filterMin = timeToMinutes(filters.StartTime);
            if (classMin == null || filterMin == null) return false;
            return classMin >= filterMin;
          });
          // Also check courseTimes for startTime
          const hasStartInCourseTimes = t.courseTimes?.some((ct) => {
            const classMin = timeToMinutes(ct?.startTime);
            const filterMin = timeToMinutes(filters.StartTime);
            if (classMin == null || filterMin == null) return false;
            return classMin >= filterMin;
          });
          return hasStartInMeetings || hasStartInCourseTimes;
        });

      // ✅ End Time filter - classes must start before the selected time
      // Edge case: if both StartTime and EndTime are set, EndTime must be > StartTime
      const hasMatchingEndTime =
        filters.EndTime === null ||
        course.terms?.some((t) => {
          const startMin = filters.StartTime ? timeToMinutes(filters.StartTime) : null;
          const endMin = timeToMinutes(filters.EndTime);
          
          // Edge case check: EndTime should be greater than StartTime if both are set
          if (startMin != null && endMin != null && endMin <= startMin) {
            return false; // Invalid range
          }

          // Check meetings for startTime
          const hasEndInMeetings = t.meetings?.some((m) => {
            const classMin = timeToMinutes(m?.startTime);
            if (classMin == null || endMin == null) return false;
            return classMin < endMin;
          });
          // Also check courseTimes for startTime
          const hasEndInCourseTimes = t.courseTimes?.some((ct) => {
            const classMin = timeToMinutes(ct?.startTime);
            if (classMin == null || endMin == null) return false;
            return classMin < endMin;
          });
          return hasEndInMeetings || hasEndInCourseTimes;
        });

      return (
        matchesSearch &&
        (filters.Credits.length === 0 || filters.Credits.includes(course.credits)) &&
        (filters.Year.length === 0 || filters.Year.includes(course.year)) &&
        (filters.Department.length === 0 ||
          filters.Department.includes(course.deptAcronym)) &&
        hasMatchingType &&
        hasMatchingDay &&
        hasMatchingStartTime &&
        hasMatchingEndTime
      );
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
