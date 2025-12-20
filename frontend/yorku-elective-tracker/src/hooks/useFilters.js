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
    Timings: [],  // ✅ Morning, Afternoon, Evening
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

    // ✅ Time Bucket options - check if any courses have classes in Morning/Afternoon/Evening
    const timeBuckets = TIME_BUCKETS.filter((bucket) =>
      courses.some((c) =>
        c.terms?.some((t) =>
          t.meetings?.some((m) => {
            const mins = timeToMinutes(m?.startTime);
            return mins != null && bucket.test(mins);
          }) ||
          t.courseTimes?.some((ct) => {
            const mins = timeToMinutes(ct?.startTime);
            return mins != null && bucket.test(mins);
          })
        )
      )
    ).map((bucket) => bucket.label);

    return {
      Credits: credits,
      Year: courseLevels,
      Department: courseDepts,
      CourseType: courseTypes,
      Day: days,
      Timings: timeBuckets,
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

      // ✅ Day filter - when day is selected, show ONLY sections offered on that specific day(s)
      // A section should only be shown if ALL of its meetings are on the selected day(s)
      const hasMatchingDay =
        filters.Day.length === 0 ||
        course.terms?.some((t) => {
          // Get all days for all meetings in this term
          const meetingDays = new Set();
          t.meetings?.forEach((m) => {
            if (m?.dayOfWeek) {
              const label = DAY_LABELS[m.dayOfWeek] || m.dayOfWeek;
              if (label) meetingDays.add(label);
            }
          });
          
          // Get all days for all courseTimes in this term
          t.courseTimes?.forEach((ct) => {
            if (ct?.dayOfWeek) {
              const label = DAY_LABELS[ct.dayOfWeek] || ct.dayOfWeek;
              if (label) meetingDays.add(label);
            }
          });
          
          // If no days found, skip this term
          if (meetingDays.size === 0) return false;
          
          // Only include this term if its days exactly match the selected days
          return meetingDays.size === filters.Day.length && 
                 Array.from(meetingDays).every(day => filters.Day.includes(day));
        });

      // ✅ Timings filter - filter by Morning/Afternoon/Evening
      const hasMatchingTimings =
        filters.Timings.length === 0 ||
        course.terms?.some((t) => {
          // Check meetings for timing
          const hasTimeInMeetings = t.meetings?.some((m) => {
            const mins = timeToMinutes(m?.startTime);
            if (mins == null) return false;
            return filters.Timings.some((timing) => {
              const timingDef = TIME_BUCKETS.find((b) => b.label === timing);
              return timingDef && timingDef.test(mins);
            });
          });
          
          // Also check courseTimes
          const hasTimeInCourseTimes = t.courseTimes?.some((ct) => {
            const mins = timeToMinutes(ct?.startTime);
            if (mins == null) return false;
            return filters.Timings.some((timing) => {
              const timingDef = TIME_BUCKETS.find((b) => b.label === timing);
              return timingDef && timingDef.test(mins);
            });
          });
          
          return hasTimeInMeetings || hasTimeInCourseTimes;
        });

      return (
        matchesSearch &&
        (filters.Credits.length === 0 || filters.Credits.includes(course.credits)) &&
        (filters.Year.length === 0 || filters.Year.includes(course.year)) &&
        (filters.Department.length === 0 ||
          filters.Department.includes(course.deptAcronym)) &&
        hasMatchingType &&
        hasMatchingDay &&
        hasMatchingTimings
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
