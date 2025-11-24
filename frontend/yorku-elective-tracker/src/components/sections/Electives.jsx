import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCourses } from "../../hooks/useCourses";
import { useFilters } from "../../hooks/useFilters";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { CourseCard } from "./CourseCard";
import { CourseDetailPanel } from "./CourseDetailPanel";
import { Pagination } from "./Pagination";
import { useLocation } from "react-router-dom";

const Electives = () => {
  const { courses, loading, error } = useCourses();
  const location = useLocation();
  const selectedTerm = location.state?.term || null;

  // Stop users from bypassing Home page
  if (!selectedTerm) {
    return (
      <div className="min-h-screen w-full bg-black/90 text-white flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold mb-3">No Term Selected</h1>
        <p className="text-gray-300 mb-6">Please select a term to view electives.</p>
        <a href="/" className="text-[#7f5af0] underline text-lg">Return Home</a>
      </div>
    );
  }

  // Filter courses that match the selected term
  const coursesForTerm = courses.filter((course) =>
    course.terms?.some((t) => t.term.startsWith(selectedTerm))
  );

  // Pass ONLY term-matching courses into useFilters
  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filterOptions,
    filteredCourses,
    clearFilters,
  } = useFilters(coursesForTerm);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 12;

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    clearFilters();
    setCurrentPage(1);
  };

  // Sort courses by popularity in descending order
  const getPopularityForCourse = (course) => {
    if (!selectedTerm || !course.terms) return 0;
    const offering = course.terms.find((t) => t.term.startsWith(selectedTerm));
    if (!offering || !offering.meetings) return 0;
    
    const pops = offering.meetings
      ?.map((m) => m.popularity)
      ?.filter((p) => p !== undefined && p !== null);
    
    return pops?.length ? Math.max(...pops) : 0;
  };

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    return getPopularityForCourse(b) - getPopularityForCourse(a);
  });

  // Pagination logic
  const indexOfLast = currentPage * coursesPerPage;
  const indexOfFirst = indexOfLast - coursesPerPage;
  const currentCourses = sortedCourses.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedCourses.length / coursesPerPage);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a] text-white flex items-center justify-center">
        <p className="text-xl">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a] text-white flex items-center justify-center">
        <p className="text-xl text-red-300">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a] text-white flex flex-col items-center overflow-x-hidden">

      {/* Background Glows */}
      <div className="absolute w-[500px] h-[500px] bg-purple-800 rounded-full blur-[180px] opacity-25 top-[-120px] left-1/2 -translate-x-1/2 animate-pulse"></div>
      <div className="absolute w-[500px] h-[500px] bg-blue-700 rounded-full blur-[180px] opacity-20 bottom-[-150px] left-1/2 -translate-x-1/2 animate-pulse"></div>

      {/* Header */}
      <section className="relative z-10 pt-12 pb-6 w-full">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-[#7f5af0] drop-shadow-[0_0_15px_rgba(127,90,240,0.35)] text-center">
          Explore Your Electives ({selectedTerm})
        </h1>
      </section>

      {/* Search Bar */}
      <div className="relative z-10 w-full flex justify-center">
        <SearchBar onSearch={handleSearch} searchQuery={searchQuery} />
      </div>

      {searchQuery && (
        <p className="relative z-10 text-sm text-gray-300 mb-2">
          Found {filteredCourses.length} courses matching "{searchQuery}"
        </p>
      )}

      {/* Filter Bar */}
      <div className="relative z-10 w-full">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          onClear={handleClearFilters}
          onFilterChange={handleFilterChange}
        />
      </div>

      <p className="relative z-10 text-sm text-gray-400 italic text-center mb-5">
        Showing {filteredCourses.length} courses • Click on a course card for more information
      </p>

      {/* Course Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl px-6 sm:px-10 pb-10">
        {currentCourses.length > 0 ? (
          currentCourses.map((course, index) => (
            <CourseCard
              key={index}
              course={course}
              selectedTerm={selectedTerm}
              onClick={() => setSelectedCourse(course)}/>

          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-300 text-lg">No courses found matching your criteria</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="relative z-10 w-full">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Course Detail Panel */}
      <AnimatePresence>
        {selectedCourse && (
          <CourseDetailPanel
            course={selectedCourse}
            selectedTerm={selectedTerm}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Electives;
