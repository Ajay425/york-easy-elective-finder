import { useState, useMemo } from "react";

export function useFilters(courses) {
  const [filters, setFilters] = useState({
    Faculty: [],
    Credits: [],
    Term: [],
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Generate filter options from courses
  const filterOptions = useMemo(() => {
    const faculties = Array.from(new Set(courses.map((c) => c.faculty))).sort();
    const credits = Array.from(new Set(courses.map((c) => c.credits))).sort(
      (a, b) => parseFloat(a) - parseFloat(b)
    );
    const terms = Array.from(
      new Set(
        courses.flatMap((c) =>
          c.terms.map((t) =>
            t.term === "F" ? "Fall" :
            t.term === "W" ? "Winter" :
            t.term === "Y" ? "Year-Long" :
            t.term === "S" ? "Summer" : t.term
          )
        )
      )
    );
    return { Faculty: faculties, Credits: credits, Term: terms };
  }, [courses]);

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const termLabels = course.terms.map((t) =>
        t.term === "F" ? "Fall" :
        t.term === "W" ? "Winter" :
        t.term === "Y" ? "Year-Long" :
        t.term === "S" ? "Summer" : t.term
      );

      const matchesSearch = searchQuery === "" ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.faculty.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        matchesSearch &&
        (filters.Faculty.length === 0 || filters.Faculty.includes(course.faculty)) &&
        (filters.Credits.length === 0 || filters.Credits.includes(course.credits)) &&
        (filters.Term.length === 0 || termLabels.some((t) => filters.Term.includes(t)))
      );
    });
  }, [courses, filters, searchQuery]);

  const clearFilters = () => {
    setFilters({ Faculty: [], Credits: [], Term: [] });
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