import { useState, useMemo } from "react";
import { YEARS, DEPARTMENTS, COURSE_TYPES } from "../lib/courseFilters";

export function useFilters(courses, initialFilters = null, initialSearch = "") {
  // Load from saved filters if provided, else use defaults
  const defaultFilters = {
    Credits: [],
    Year: [],
    Department: [],
    CourseType: [],
  };

  const [filters, setFilters] = useState(initialFilters || defaultFilters);
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
        c.terms?.some((t) =>
          t.meetings?.some((m) => m.type === type)
        )
      )
    );

    return {
      Credits: credits,
      Year: courseLevels,
      Department: courseDepts,
      CourseType: courseTypes,
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

      return (
        matchesSearch &&
        (filters.Credits.length === 0 ||
          filters.Credits.includes(course.credits)) &&
        (filters.Year.length === 0 || filters.Year.includes(course.year)) &&
        (filters.Department.length === 0 ||
          filters.Department.includes(course.deptAcronym)) &&
        hasMatchingType
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
