import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCourses } from "../../hooks/useCourses";
import { useCourseMeta } from "../../hooks/useCourseMeta";
import { useFilters } from "../../hooks/useFilters";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { CourseCard } from "./CourseCard";
import { CourseDetailPanel } from "./CourseDetailPanel";
import { SavedCatNumbers } from "./SavedCatNumbers";
import { ScheduleVisualizer } from "./ScheduleVisualizer";
import { Pagination } from "./Pagination";
import { UpdatesPopup } from "../UpdatesPopup";
import { useLocation, useNavigate } from "react-router-dom";
import { Bookmark, CalendarDays, Mail, Search } from "lucide-react";
import { useSavedCatNumbers } from "../../hooks/useSavedCatNumbers";
import { termMatchesSelection } from "../../lib/termMatching";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function courseMatchesSearch(course, query) {
  if (!query) return false;

  return [
    course.code,
    course.title,
    course.name,
    course.faculty,
    course.facultyPrefix,
    course.deptAcronym,
    course.dept,
  ].some((value) =>
    String(value || "").toLowerCase().includes(query)
  );
}

const Electives = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationTerm = location.state?.term || null;
  const [selectedTerm, setSelectedTerm] = useState(locationTerm);
  const courseMeta = useCourseMeta();
  const selectedTermMeta = courseMeta.terms.find((item) => item.term === selectedTerm);
  const selectedTermLabel = selectedTermMeta?.label || location.state?.termLabel || selectedTerm;
  const selectedTermAndYear = courseMeta.termAndYear || location.state?.termAndYear || null;
  const { courses, loading, error } = useCourses();
  const {
    savedEntries,
    savedIds,
    saveCatNumber,
    removeCatNumber,
  } = useSavedCatNumbers();

  // Filter courses that match the selected term
  const coursesForTerm = useMemo(
    () => selectedTerm
      ? courses
          .map((course) => {
            const termOfferings = (course.terms || []).filter((t) =>
              termMatchesSelection(t.term, selectedTerm)
            );

            if (termOfferings.length === 0) return null;

            return {
              ...course,
              allTerms: course.terms || [],
              terms: termOfferings,
            };
          })
          .filter(Boolean)
      : [],
    [courses, selectedTerm]
  );

  // Load saved data
  const savedFilters = (() => {
  try {
    return JSON.parse(localStorage.getItem("electiveFilters"));
  } catch {
    return null;
  }
})();

const savedSearch = localStorage.getItem("electiveSearch") || "";



  // Pass ONLY term-matching courses into useFilters
  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filterOptions,
    filteredCourses,
    clearFilters,
  } = useFilters(coursesForTerm, savedFilters, savedSearch);

  const labelForTermCode = (term) =>
    courseMeta.terms.find((item) => item.term === term)?.label || term;

  const outsideTermMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!selectedTerm || !query) return [];

    return courses
      .filter((course) =>
        !course.terms?.some((t) => termMatchesSelection(t.term, selectedTerm))
      )
      .filter((course) => courseMatchesSearch(course, query));
  }, [courses, searchQuery, selectedTerm]);

  const summarizeCourseTerms = (course) => {
    const terms = Array.from(new Set((course.terms || []).map((t) => t.term).filter(Boolean)));
    return terms.map(labelForTermCode).join(", ");
  };




  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 12;

  useEffect(() => {
    if (locationTerm) setSelectedTerm(locationTerm);
  }, [locationTerm]);

  // save current search filters

  useEffect(() => {
    const savedFilters = localStorage.getItem("electiveFilters");
    const savedSearch = localStorage.getItem("electiveSearch");
    const savedPage = localStorage.getItem("electivePage");

    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch {
        // Ignore invalid saved filter data.
      }
  }

  if (savedSearch) {
    setSearchQuery(savedSearch);
  }
  if (savedPage) {
    setCurrentPage(Number(savedPage));
  }
  }, [setFilters, setSearchQuery]);


  // now save the filters

  useEffect(() => {
    localStorage.setItem("electiveFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem("electiveSearch", searchQuery);
  }, [searchQuery]);
  useEffect(() => {
    localStorage.setItem("electivePage", currentPage);
  }, [currentPage]);




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

  const handleTermChange = (term) => {
    const termMeta = courseMeta.terms.find((item) => item.term === term);
    setSelectedTerm(term);
    setSelectedCourseDetails(null);
    setActiveTab("browse");
    setCurrentPage(1);
    navigate("/electives", {
      replace: true,
      state: {
        term,
        termLabel: termMeta?.label || term,
        termAndYear: selectedTermAndYear,
      },
    });
  };

  const openCourseDetails = (course, options = {}) => {
    setSelectedCourseDetails({
      course,
      term: options.term || selectedTerm,
      termLabel: options.termLabel || selectedTermLabel,
      highlightedCatId: options.highlightedCatId || null,
    });
  };

  const handleOpenSavedCourse = (course, entry) => {
    openCourseDetails(course, {
      term: entry.term,
      termLabel: entry.termLabel,
      highlightedCatId: entry.id,
    });
  };

  const getOfferingTermLabel = (offeringTerm) => {
    const termMeta = courseMeta.terms.find((item) => item.term === offeringTerm);
    if (termMeta?.label) return termMeta.label;
    if (offeringTerm === selectedCourseDetails?.term && selectedCourseDetails?.termLabel) {
      return selectedCourseDetails.termLabel;
    }
    return offeringTerm || selectedTermLabel;
  };

  const handleSaveCatNumber = (course, offering) => {
    saveCatNumber(course, offering, getOfferingTermLabel(offering?.term), selectedTermAndYear);
  };

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

  // Sort courses by popularity in descending order
  const getPopularityForCourse = (course) => {
    if (!selectedTerm || !course.terms) return 0;
    const pops = course.terms
      .filter((t) => termMatchesSelection(t.term, selectedTerm))
      .flatMap((offering) => offering.meetings || [])
      .map((m) => m.popularity)
      .filter((p) => p !== undefined && p !== null);
    
    return pops.length ? Math.max(...pops) : 0;
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
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a] text-white flex flex-col items-center overflow-x-hidden overflow-y-hidden">

      {/* Updates Popup */}
      <UpdatesPopup />

      {/* Background Glows */}
      <div className="absolute w-[500px] h-[500px] bg-purple-800 rounded-full blur-[180px] opacity-25 top-[-120px] left-1/2 -translate-x-1/2 animate-pulse"></div>
      <div className="absolute w-[500px] h-[500px] bg-blue-700 rounded-full blur-[180px] opacity-20 bottom-[-150px] left-1/2 -translate-x-1/2 animate-pulse"></div>

      {/* Header */}
      <section className="relative z-10 pt-12 pb-6 w-full">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-[#7f5af0] drop-shadow-[0_0_15px_rgba(127,90,240,0.35)] text-center">
          Explore Your Electives ({selectedTermLabel})
        </h1>
        {selectedTermAndYear && (
          <p className="mt-2 text-center text-sm text-gray-400">{selectedTermAndYear}</p>
        )}
        <div className="mx-auto mt-4 w-full max-w-xs px-4">
          <Select value={selectedTerm} onValueChange={handleTermChange}>
            <SelectTrigger className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white">
              <SelectValue placeholder="Select a Term..." />
            </SelectTrigger>
            <SelectContent className="bg-black/80 backdrop-blur-xl text-white border-white/10">
              {courseMeta.terms.map(({ term, label }) => (
                <SelectItem key={term} value={term}>
                  {label ? `${label} (${term})` : term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Contact Icon */}
  <div className="absolute top-4 left-4 z-20 group/mail">
    <div onClick={ (e) => {
      e.stopPropagation();
      window.location.href = '/contact-us'
    }} className="h-10 w-10 flex items-center justify-center border border-purple-400/50 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 hover:from-purple-500/40 hover:to-pink-500/30 hover:border-purple-400 shadow-lg shadow-purple-500/20 group-hover/mail:shadow-purple-500/40 transition-all duration-300 cursor-pointer group-hover/mail:scale-110">
      <Mail className="w-5 h-5 text-purple-300 group-hover/mail:text-purple-200 transition-colors duration-300" />
    <div className="absolute top-12 left-0 px-3 py-2 bg-gray-900 text-purple-200 text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover/mail:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg border border-purple-400/30">
    Contact Us
    </div>
    </div>
  </div>

      {/* Powered By SSADC  styling here*/}
  <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
    <a href="https://yorku.dev" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-br from-gray-800/40 via-gray-900/40 to-black/40 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400/60 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 group hover:scale-105">
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors duration-300">Powered by</span>
      <span className="text-sm font-bold text-[#7f5af0] group-hover:text-[#a855f7] transition-colors duration-300">SSADC</span>
    </a>
  </div>




      {/* Search Bar */}
      <div className="relative z-10 mb-5 mx-4 flex max-w-[calc(100%-2rem)] flex-wrap justify-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 shadow-lg shadow-black/20">
        <button
          type="button"
          onClick={() => setActiveTab("browse")}
          className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition sm:h-10 sm:gap-2 sm:px-4 ${
            activeTab === "browse"
              ? "bg-purple-500/25 text-white border border-purple-300/30"
              : "bg-transparent text-gray-300 hover:text-white"
          }`}
        >
          <Search className="h-4 w-4" />
          Browse
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition sm:h-10 sm:gap-2 sm:px-4 ${
            activeTab === "saved"
              ? "bg-purple-500/25 text-white border border-purple-300/30"
              : "bg-transparent text-gray-300 hover:text-white"
          }`}
        >
          <Bookmark className="h-4 w-4" />
          Saved
          {savedEntries.length > 0 && (
            <span className="rounded-md bg-purple-300 px-1.5 py-0.5 text-[10px] font-bold text-black">
              {savedEntries.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition sm:h-10 sm:gap-2 sm:px-4 ${
            activeTab === "schedule"
              ? "bg-purple-500/25 text-white border border-purple-300/30"
              : "bg-transparent text-gray-300 hover:text-white"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Schedule
        </button>
      </div>

      {activeTab === "browse" ? (
        <>
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
            Showing {filteredCourses.length} courses
          </p>

          {/* Course Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl px-6 sm:px-10 pb-10">
            {currentCourses.length > 0 ? (
              currentCourses.map((course) => (
                <CourseCard
                  key={course.code}
                  course={course}
                  selectedTerm={selectedTerm}
                  onClick={() => openCourseDetails(course)}
                />

              ))
            ) : outsideTermMatches.length > 0 ? (
              <div className="col-span-full mx-auto w-full max-w-2xl rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-5 text-left">
                <h3 className="text-lg font-semibold text-yellow-100">
                  Matches exist outside {selectedTermLabel || selectedTerm}
                </h3>
                <p className="mt-2 text-sm text-yellow-50/85">
                  Your selected term is still being respected. These matching courses are available in a different term:
                </p>
                <div className="mt-4 space-y-3">
                  {outsideTermMatches.slice(0, 5).map((course) => (
                    <div key={course.code} className="rounded-md border border-white/10 bg-black/20 p-3">
                      <p className="font-semibold text-white">{course.code}</p>
                      <p className="text-sm text-gray-300">{course.title}</p>
                      <p className="mt-1 text-xs text-yellow-100">
                        Available in: {summarizeCourseTerms(course)}
                      </p>
                    </div>
                  ))}
                </div>
                {outsideTermMatches.length > 5 && (
                  <p className="mt-3 text-xs text-yellow-50/75">
                    And {outsideTermMatches.length - 5} more matching courses outside this selected term.
                  </p>
                )}
                <p className="mt-4 text-sm text-gray-300">
                  Switch the term dropdown above to view these courses.
                </p>
              </div>
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
        </>
      ) : activeTab === "saved" ? (
        <SavedCatNumbers
          courses={courses}
          savedEntries={savedEntries}
          onOpenCourse={handleOpenSavedCourse}
          onRemove={removeCatNumber}
        />
      ) : (
        <ScheduleVisualizer
          courses={courses}
          savedEntries={savedEntries}
          selectedTerm={selectedTerm}
          selectedTermLabel={selectedTermLabel}
          selectedTermAndYear={selectedTermAndYear}
          onOpenCourse={handleOpenSavedCourse}
        />
      )}

      {/* Course Detail Panel */}
      <AnimatePresence>
        {selectedCourseDetails && (
          <CourseDetailPanel
            course={selectedCourseDetails.course}
            selectedTerm={selectedCourseDetails.term}
            selectedTermLabel={selectedCourseDetails.termLabel}
            onClose={() => setSelectedCourseDetails(null)}
            savedCatIds={savedIds}
            onSaveCatNumber={handleSaveCatNumber}
            onRemoveCatNumber={removeCatNumber}
            highlightedCatId={selectedCourseDetails.highlightedCatId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Electives;
