import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCourses } from "../../hooks/useCourses";
import { useFilters } from "../../hooks/useFilters";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { CourseCard } from "./CourseCard";
import { CourseDetailPanel } from "./CourseDetailPanel";
import { Pagination } from "./Pagination";

const Electives = () => {
  const { courses, loading, error } = useCourses();
  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filterOptions,
    filteredCourses,
    clearFilters,
  } = useFilters(courses);

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

  // Pagination
  const indexOfLast = currentPage * coursesPerPage;
  const indexOfFirst = indexOfLast - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#A42439] text-white flex items-center justify-center">
        <p className="text-xl">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#A42439] text-white flex items-center justify-center">
        <p className="text-xl text-red-300">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#A42439] text-white flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <section className="bg-[#A42439] pt-2 w-full">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent drop-shadow-lg text-center">
          Explore Your Electives
        </h1>
      </section>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} searchQuery={searchQuery} />

      {searchQuery && (
        <p className="text-sm text-yellow-100 mb-2">
          Found {filteredCourses.length} courses matching "{searchQuery}"
        </p>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        filterOptions={filterOptions}
        onClear={handleClearFilters}
        onFilterChange={handleFilterChange}
      />

      <p className="text-sm text-yellow-100 italic text-center mb-5">
        Showing {filteredCourses.length} courses • Click on a course card for more information
      </p>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl px-6 sm:px-10 pb-10">
        {currentCourses.length > 0 ? (
          currentCourses.map((course, index) => (
            <CourseCard
              key={index}
              course={course}
              onClick={() => setSelectedCourse(course)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-yellow-100 text-lg">No courses found matching your criteria</p>
            <p className="text-gray-300 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Course Detail Panel */}
      <AnimatePresence>
        {selectedCourse && (
          <CourseDetailPanel
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Electives;