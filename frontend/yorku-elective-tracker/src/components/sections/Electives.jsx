import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { buildCoursesURL } from "../../lib/courseFilters";
import { Input } from "@/components/ui/input";

const Electives = () => {
  const [filters, setFilters] = useState({
    Faculty: [],
    Credits: [],
    Term: [],
  });

  const [courses, setCourses] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    Faculty: [],
    Credits: [],
    Term: [],
  });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const coursesPerPage = 12;

  // Fetch and normalize course data
  useEffect(() => {
    fetch(buildCoursesURL())
      .then((res) => res.json())
      .then((responseData) => {
        const data = responseData.courses;

        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn("No courses returned from API");
          return;
        }

        const formatted = data.map((c) => ({
          code: `${c.faculty}/${c.deptAcronym} ${c.courseCode}`,
          title: c.name,
          credits: c.credit.toFixed(2),
          faculty:
            c.faculty === "SB"
              ? "Schulich School of Business"
              : c.faculty === "AP"
              ? "Faculty of Liberal Arts & Professional Studies"
              : c.faculty === "SC"
              ? "Faculty of Science"
              : c.faculty === "LE"
              ? "Lassonde School of Engineering"
              : c.faculty === "ED"
              ? "Faculty of Education"
              : "Other",

          description: c.desc || "",
          topInstructorPopularity:
            c.courseOfferings?.[0]?.instructors?.[0]?.instructor?.popularity,
          topInstructorName: c.courseOfferings?.[0]?.instructors?.[0]?.instructor
            ? `${c.courseOfferings[0].instructors[0].instructor.firstname} ${c.courseOfferings[0].instructors[0].instructor.lastname}`
            : null,

          terms: (c.courseOfferings || []).map((offering) => ({
            term: offering.term,
            section: offering.section,
            meetings: (offering.instructors || []).map((io) => ({
              type: offering.type,
              firstName: io.instructor?.firstname || "TBA",
              lastName: io.instructor?.lastname || "",
              avgRating: io.instructor?.avgRating,
              avgDifficulty: io.instructor?.avgDifficulty,
              wouldTakeAgainPercent: io.instructor?.wouldTakeAgainPercent,
              numberOfRatings: io.instructor?.numberOfRatings,
              rateMyProfLink: io.instructor?.rateMyProfLink,
            })),
          })),
        }));

        const faculties = Array.from(new Set(formatted.map((c) => c.faculty))).sort();
        const credits = Array.from(
          new Set(formatted.map((c) => c.credits))
        ).sort((a, b) => parseFloat(a) - parseFloat(b));
        const terms = Array.from(
          new Set(
            formatted.flatMap((c) =>
              c.terms.map((t) =>
                t.term === "F"
                  ? "Fall"
                  : t.term === "W"
                  ? "Winter"
                  : t.term === "Y"
                  ? "Year-Long"
                  : t.term === "S"
                  ? "Summer"
                  : t.term
              )
            )
          )
        );

        setCourses(formatted);
        setFilterOptions({ Faculty: faculties, Credits: credits, Term: terms });
      })
      .catch((err) => console.error("Failed to load courses:", err));
  }, []);

  // Multi-select filtering logic
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const termLabels = course.terms.map((t) =>
        t.term === "F"
          ? "Fall"
          : t.term === "W"
          ? "Winter"
          : t.term === "Y"
          ? "Year-Long"
          : t.term === "S"
          ? "Summer"
          : t.term
      );

      const matchesSearch =
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
  }, [courses, filters]);

  // Pagination
  const indexOfLast = currentPage * coursesPerPage;
  const indexOfFirst = indexOfLast - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  return (
    <div className="relative min-h-screen w-full bg-[#A42439] text-white flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <section className="bg-[#A42439] pt-2 w-full">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent drop-shadow-lg text-center">
          Explore Your Electives
        </h1>
      </section>

      {/* Search Bar + Search Button */}
<div className="w-full max-w-3xl px-6 sm:px-10 mt-6 mb-4 flex items-center gap-3">

  {/* Input */}
  <Input
    type="text"
    placeholder="Search courses (e.g., EECS 1012, Psychology, 3.00)…"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") setSearchQuery(searchInput);
    }}
    className="
      flex-1 rounded-xl bg-white/10 backdrop-blur-md text-white 
      placeholder:text-white/50 border border-white/20 shadow-sm
      focus-visible:ring-yellow-300 focus-visible:ring-offset-0
    "
  />

  {/* Search Button */}
  <button
    onClick={() => setSearchQuery(searchInput)}
    className="
      px-5 py-2 rounded-xl font-semibold text-white text-sm
      bg-white/10 backdrop-blur-md border border-white/20
      shadow-[0_3px_6px_rgba(0,0,0,0.4)]
      hover:bg-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.25)]
      active:scale-95 transition-all
    "
  >
    Search
  </button>
</div>




      {/* FILTER BAR (TOP) */}
      <div className="flex flex-wrap justify-center gap-3 px-4 sm:px-8 mb-8 mt-6">
        {Object.entries(filterOptions).map(([filterName, options]) => (
          <DropdownMenu key={filterName}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <span>
                  {filters[filterName].length === 0
                    ? filterName
                    : `${filterName} (${filters[filterName].length})`}
                </span>

                {/* TAGS INSIDE BUTTON */}
                {filters[filterName].length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {filters[filterName].slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-yellow-200 text-black rounded-md"
                      >
                        {tag}
                      </span>
                    ))}

                    {filters[filterName].length > 2 && (
                      <span className="text-xs text-yellow-100">
                        +{filters[filterName].length - 2}
                      </span>
                    )}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-white/10 text-white border border-white/20 backdrop-blur-md max-h-64 overflow-y-auto">
              {options.map((option) => {
                const active = filters[filterName].includes(option);
                return (
                  <DropdownMenuItem
                    key={option}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        [filterName]: active
                          ? prev[filterName].filter((x) => x !== option)
                          : [...prev[filterName], option],
                      }))
                    }
                    className={`cursor-pointer ${active ? "bg-white/20" : ""}`}
                  >
                    {option}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        <Button
          onClick={() => setFilters({ Faculty: [], Credits: [], Term: [] })}
          variant="secondary"
          className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
        >
          Clear
        </Button>
      </div>

      <p className="text-sm text-yellow-100 italic text-center mb-5">
        Note: Click on a course card for more information, including descriptions, instructors, and ratings.
      </p>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl px-6 sm:px-10 pb-10">
        {currentCourses.map((course, index) => (
          <Card
            key={index}
            onClick={() => setSelectedCourse(course)}
            className="cursor-pointer rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg hover:shadow-2xl hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1"
          >
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white tracking-tight">
                {course.code}
              </CardTitle>
              <CardDescription className="text-gray-200 font-medium text-sm">
                {course.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-sm mb-3">
                Credits: {course.credits}
              </p>
              <p className="text-gray-300 text-xs mb-2">
                Faculty: {course.faculty}
              </p>

              {course.topInstructorPopularity && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <p className="text-yellow-200 text-sm font-semibold">
                    🔥 Popularity: {course.topInstructorPopularity.toFixed(0)}/100
                  </p>
                  {course.topInstructorName && (
                    <p className="text-gray-300 text-xs italic">
                      {course.topInstructorName}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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

      {/* Slide-In Info Panel */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 80 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl p-6 z-50 flex flex-col overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#A42439]/60 backdrop-blur-md p-2 rounded">
              <h2 className="text-xl font-bold text-white">{selectedCourse.code}</h2>
              <button onClick={() => setSelectedCourse(null)}>
                <X className="text-white w-6 h-6 hover:text-yellow-200" />
              </button>
            </div>

            <h3 className="text-lg text-yellow-100 mb-2">{selectedCourse.title}</h3>
            <p className="text-gray-200 text-sm mb-4">
              {selectedCourse.description}
            </p>

            <p className="text-gray-300 text-sm mb-2">
              <strong>Faculty:</strong> {selectedCourse.faculty}
            </p>
            <p className="text-gray-300 text-sm mb-2">
              <strong>Credits:</strong> {selectedCourse.credits}
            </p>

            <p className="text-sm text-yellow-100 italic mb-5">
              Note: Always double check if you need permission from an instructor to enroll into this course.
            </p>

            {selectedCourse.terms?.length > 0 && (
              <div className="mt-4 space-y-6">
                <h4 className="text-yellow-200 font-semibold mb-2">
                  Sections & Instructors:
                </h4>

                {selectedCourse.terms.some((t) => t.term === "F") && (
                  <TermSection
                    title="🍂 Fall"
                    color="text-yellow-300"
                    terms={selectedCourse.terms.filter((t) => t.term === "F")}
                  />
                )}

                {selectedCourse.terms.some((t) => t.term === "W") && (
                  <TermSection
                    title="❄️ Winter"
                    color="text-blue-300"
                    terms={selectedCourse.terms.filter((t) => t.term === "W")}
                  />
                )}

                {selectedCourse.terms.filter((t) => !["F", "W"].includes(t.term))
                  .length > 0 && (
                  <TermSection
                    title="📘 Other / Year-Long"
                    color="text-green-300"
                    terms={selectedCourse.terms.filter(
                      (t) => !["F", "W"].includes(t.term)
                    )}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable Term Section component
const TermSection = ({ title, color, terms }) => (
  <div>
    <h5 className={`text-lg ${color} font-semibold mb-2`}>{title}</h5>
    <div className="space-y-3">
      {terms.map((term, idx) => (
        <div
          key={`${title}-${idx}`}
          className="bg-white/10 p-3 rounded-lg border border-white/20"
        >
          <p className="text-sm text-gray-100 mb-1">
            <strong>Section {term.section}</strong>
          </p>
          <ul className="text-xs text-gray-200 list-disc ml-4">
            {term.meetings?.length ? (
              term.meetings.map((m, i) => (
                <li key={i}>
                  {m.type}: {m.firstName || "TBA"} {m.lastName || ""}
                  {m.avgRating && m.numberOfRatings && (
                    <span className="text-yellow-200 ml-2">
                      ⭐ {m.avgRating.toFixed(1)} ({m.numberOfRatings} ratings)
                      {m.wouldTakeAgainPercent && (
                        <span className="ml-1">
                          • {m.wouldTakeAgainPercent.toFixed(0)}% would take again
                        </span>
                      )}
                    </span>
                  )}
                  {m.rateMyProfLink && (
                    <a
                      href={m.rateMyProfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 ml-2 hover:underline"
                    >
                      View RMP
                    </a>
                  )}
                </li>
              ))
            ) : (
              <li className="italic text-gray-300">No meeting info</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

export default Electives;
