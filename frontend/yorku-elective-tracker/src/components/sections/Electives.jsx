import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import FilterBar from "./FilterBar";
import CourseGrid from "./CourseGrid";
import CourseInfoPanel from "./CourseInfo";

const Electives = () => {
  const [filters, setFilters] = useState({
    Faculty: "",
    Credits: "",
    Term: "",
    Level: "",
  });

  const [courses, setCourses] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    Faculty: [],
    Credits: [],
    Term: [],
    Level: [],
  });

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 12;

  // -----------------------
  // Fetch and Normalize Data
  // -----------------------
  useEffect(() => {
    fetch("/data/all_courses.json")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((c) => {
          const codeNum = parseInt(c.code, 10);
          const level = Math.floor(codeNum / 1000) * 1000 || "Other";

          return {
            code: `${c.facultyPrefix}/${c.dept} ${c.code}`,
            title: c.title,
            credits: c.credit.toFixed(2),
            faculty:
              c.facultyPrefix === "SB"
                ? "Schulich School of Business"
                : c.facultyPrefix === "AP"
                ? "Faculty of Liberal Arts & Professional Studies"
                : c.facultyPrefix === "SC"
                ? "Faculty of Science"
                : c.facultyPrefix === "LE"
                ? "Lassonde School of Engineering"
                : c.facultyPrefix === "ED"
                ? "Faculty of Education"
                : "Other",
            description: c.description,
            level,
            terms: (c.terms || []).map((t) => ({
              ...t,
              label:
                t.term === "F"
                  ? "Fall"
                  : t.term === "W"
                  ? "Winter"
                  : t.term === "S"
                  ? "Summer"
                  : t.term,
            })),
          };
        });

        // Build unique filter sets efficiently
        const facultiesSet = new Set();
        const creditsSet = new Set();
        const termsSet = new Set();
        const levelsSet = new Set();

        formatted.forEach((c) => {
          facultiesSet.add(c.faculty);
          creditsSet.add(c.credits);
          c.terms.forEach((t) => termsSet.add(t.label));
          levelsSet.add(c.level);
        });

        setCourses(formatted);
        setFilterOptions({
          Faculty: [...facultiesSet].sort(),
          Credits: [...creditsSet].sort((a, b) => parseFloat(a) - parseFloat(b)),
          Term: [...termsSet],
          Level: [...levelsSet].sort((a, b) => a - b),
        });
      })
      .catch((err) => console.error("Failed to load courses:", err));
  }, []);

  // -----------------------
  // Filtering + Sorting
  // -----------------------
  const filteredCourses = useMemo(() => {
    const results = courses.filter((course) => {
      const termLabels = course.terms.map((t) => t.label);
      return (
        (!filters.Faculty || course.faculty === filters.Faculty) &&
        (!filters.Credits || course.credits === filters.Credits) &&
        (!filters.Term || termLabels.includes(filters.Term)) &&
        (!filters.Level || course.level.toString() === filters.Level.toString())
      );
    });

    // ✅ Always sort by course level ascending (1000 → 2000 → 3000)
    return results.sort((a, b) => a.level - b.level);
  }, [courses, filters]);

  // -----------------------
  // Pagination
  // -----------------------
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const currentCourses = useMemo(() => {
    const start = (currentPage - 1) * coursesPerPage;
    const end = start + coursesPerPage;
    return filteredCourses.slice(start, end);
  }, [filteredCourses, currentPage]);

  // -----------------------
  // Handlers
  // -----------------------
  const handleClearFilters = useCallback(() => {
    setFilters({ Faculty: "", Credits: "", Term: "", Level: "" });
    setCurrentPage(1);
  }, []);

  const handleSelectCourse = useCallback((course) => setSelectedCourse(course), []);
  const handleClosePanel = useCallback(() => setSelectedCourse(null), []);

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="relative min-h-screen w-full bg-[#A42439] text-white flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <section className="bg-[#A42439] pt-2 w-full">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent drop-shadow-lg text-center">
          Explore Your Electives
        </h1>
      </section>

      {/* Filters */}
      <FilterBar
        filters={filters}
        filterOptions={filterOptions}
        setFilters={setFilters}
        onClear={handleClearFilters}
      />

      <p className="text-sm text-yellow-100 italic text-center mb-5">
        Note: Click on a course card for more information about the course description, prerequisites and instructors.
      </p>

      {/* Course Grid */}
      <CourseGrid courses={currentCourses} onSelect={handleSelectCourse} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mb-10">
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            Prev
          </Button>
          <span className="text-sm text-yellow-100">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      )}

      {/* Slide-In Course Info Panel */}
      <AnimatePresence>
        {selectedCourse && (
          <CourseInfoPanel course={selectedCourse} onClose={handleClosePanel} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Electives;
