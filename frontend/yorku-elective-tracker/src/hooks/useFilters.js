import { useState, useMemo } from "react";
import { YEARS, DEPARTMENTS, COURSE_TYPES } from "../lib/courseFilters";

export function useFilters(courses) {
  const [filters, setFilters] = useState({
    Faculty: [],
    Credits: [],
    Year: [],
    Department: [],
    CourseType: [],
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Generate filter options from courses
  const filterOptions = useMemo(() => {
    const faculties = Array.from(new Set(courses.map((c) => c.faculty))).sort();
    const credits = Array.from(new Set(courses.map((c) => c.credits))).sort(
      (a, b) => parseFloat(a) - parseFloat(b)
    );
    // Use predefined year and department constants, filter to only those present in courses
    const courseLevels = YEARS.filter(year => 
      courses.some(c => c.year === year)
    );
    const courseDepts = DEPARTMENTS.filter(dept => 
      courses.some(c => c.deptAcronym === dept)
    );
    const courseTypes = COURSE_TYPES.filter(type => 
      courses.some(c => c.terms?.some(t => t.meetings?.some(m => m.type === type)))
    );
    return { Faculty: faculties, Credits: credits, Year: courseLevels, Department: courseDepts, CourseType: courseTypes };
  }, [courses]);

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch = searchQuery === "" ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.faculty.toLowerCase().includes(searchQuery.toLowerCase());

      // Check if course has any meetings with selected types
      const hasMatchingType = filters.CourseType.length === 0 || 
        course.terms?.some(t => 
          t.meetings?.some(m => filters.CourseType.includes(m.type))
        );

      return (
        matchesSearch &&
        (filters.Faculty.length === 0 || filters.Faculty.includes(course.faculty)) &&
        (filters.Credits.length === 0 || filters.Credits.includes(course.credits)) &&
        (filters.Year.length === 0 || filters.Year.includes(course.year)) &&
        (filters.Department.length === 0 || filters.Department.includes(course.deptAcronym)) &&
        hasMatchingType
      );
    });
  }, [courses, filters, searchQuery]);

  const clearFilters = () => {
    setFilters({ Faculty: [], Credits: [], Year: [], Department: [], CourseType: [] });
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