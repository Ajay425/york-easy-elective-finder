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

const Electives = () => {
  const [filters, setFilters] = useState({
    Faculty: "",
    Credits: "",
    Term: "",
  });

  const [courses, setCourses] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    Faculty: [],
    Credits: [],
    Term: [],
  });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 12;

  // Fetch and normalize course data
  useEffect(() => {
    fetch("/data/all_courses.json")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((c) => ({
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
          terms: c.terms || [],
        }));

        // Extract dynamic filter options
        const faculties = Array.from(
          new Set(formatted.map((c) => c.faculty))
        ).sort();
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

  // Filter courses dynamically
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const termLabels = course.terms.map((t) =>
        t.term === "F"
          ? "Fall"
          : t.term === "W"
          ? "Winter"
          : t.term === "S"
          ? "Summer"
          : t.term
      );

      return (
        (!filters.Faculty || course.faculty === filters.Faculty) &&
        (!filters.Credits || course.credits === filters.Credits) &&
        (!filters.Term || termLabels.includes(filters.Term))
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

      {/* Dynamic Filter Bar */}
      <div className="flex flex-wrap justify-center gap-3 px-4 sm:px-8 mb-8 mt-6">
        {Object.entries(filterOptions).map(([filterName, options]) => (
          <DropdownMenu key={filterName}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                {filters[filterName] || filterName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white/10 text-white border border-white/20 backdrop-blur-md max-h-64 overflow-y-auto">
              {options.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      [filterName]: option === prev[filterName] ? "" : option,
                    }))
                  }
                  className={`cursor-pointer ${
                    filters[filterName] === option ? "bg-white/20" : ""
                  }`}
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
        <Button
          onClick={() =>
            setFilters({
              Faculty: "",
              Credits: "",
              Term: "",
            })
          }
          variant="secondary"
          className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
        >
          Clear Filters
        </Button>
      </div>

      <p className="text-sm text-yellow-100 italic text-center mb-5">
        Note: Click on course card for more information about the course description and instructors.
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
              <p className="text-gray-300 text-xs">Faculty: {course.faculty}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      

      {/* Pagination Controls */}
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
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl p-6 z-50 flex flex-col overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#A42439]/60 backdrop-blur-md p-2 rounded">
              <h2 className="text-xl font-bold text-white">
                {selectedCourse.code}
              </h2>
              <button onClick={() => setSelectedCourse(null)}>
                <X className="text-white w-6 h-6 hover:text-yellow-200" />
              </button>
            </div>

            <h3 className="text-lg text-yellow-100 mb-2">
              {selectedCourse.title}
            </h3>
            <p className="text-gray-200 text-sm mb-4">
              {selectedCourse.description}
            </p>
            <p className="text-gray-300 text-sm mb-2">
              <strong>Faculty:</strong> {selectedCourse.faculty}
            </p>
            <p className="text-gray-300 text-sm mb-2">
              <strong>Credits:</strong> {selectedCourse.credits}
            </p>

            {/* Display all sections and instructors */}
            {selectedCourse.terms?.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-yellow-200 font-semibold mb-2">
                  Sections & Instructors:
                </h4>
                {selectedCourse.terms.map((term, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 p-3 rounded-lg border border-white/20"
                  >
                    <p className="text-sm text-gray-100 mb-1">
                      <strong>
                        Term:{" "}
                        {term.term === "F"
                          ? "Fall"
                          : term.term === "W"
                          ? "Winter"
                          : term.term === "S"
                          ? "Summer"
                          : term.term}
                      </strong>{" "}
                      — Section {term.section}
                    </p>
                    <ul className="text-xs text-gray-200 list-disc ml-4">
                      {term.meetings.map((m, i) => (
                        <li key={i}>
                          {m.type}: {m.firstName || "TBA"}{" "}
                          {m.lastName || ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Electives;
