import { useState } from "react";
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

const filterOptions = {
  Faculty: ["Lassonde", "Science", "Health", "LA&PS", "Schulich"],
  Credits: ["3.00", "6.00"],
  Popularity: ["⭐ High", "⭐ Medium", "⭐ Low"],
};

const Electives = () => {
  const [filters, setFilters] = useState({
    Faculty: "",
    Credits: "",
    Popularity: "",
  });

  const [selectedCourse, setSelectedCourse] = useState(null);

  const courses = [
    { code: "EECS 1011", title: "Introduction to Programming", credits: "3.00", faculty: "Lassonde School of Engineering", description: "Covers programming fundamentals using Java. Topics include loops, conditionals, arrays, and object-oriented design.", lecture: "Mon & Wed 2:30 PM - 4:00 PM" },
    { code: "MATH 1013", title: "Calculus I", credits: "3.00", faculty: "Faculty of Science", description: "Differential calculus with applications to physical sciences and engineering.", lecture: "Tue & Thu 10:00 AM - 11:30 AM" },
    { code: "PSYC 1010", title: "Introduction to Psychology", credits: "6.00", faculty: "Faculty of Health", description: "Introduction to the scientific study of human behaviour and mental processes.", lecture: "Mon, Wed, Fri 9:30 AM - 10:30 AM" },
    { code: "EECS 2030", title: "Advanced Object-Oriented Programming", credits: "3.00", faculty: "Lassonde School of Engineering", description: "Covers design patterns, Java, and software engineering principles.", lecture: "Tue & Thu 1:00 PM - 2:30 PM" },
    { code: "MATH 1025", title: "Applied Linear Algebra", credits: "3.00", faculty: "Faculty of Science", description: "Explore matrices, vectors, and transformations for practical computation.", lecture: "Mon & Wed 11:00 AM - 12:30 PM" },
    { code: "PHIL 1000", title: "Introduction to Philosophy", credits: "3.00", faculty: "Faculty of Liberal Arts & Professional Studies", description: "Investigate questions about knowledge, existence, and ethics.", lecture: "Wed & Fri 2:00 PM - 3:30 PM" },
    { code: "HUMA 1200", title: "Understanding Literature", credits: "3.00", faculty: "Faculty of Liberal Arts & Professional Studies", description: "An overview of literary genres, themes, and critical reading methods.", lecture: "Tue 6:00 PM - 9:00 PM" },
    { code: "ECON 1000", title: "Introduction to Microeconomics", credits: "3.00", faculty: "Faculty of Liberal Arts & Professional Studies", description: "Understand how individuals and firms make economic decisions.", lecture: "Mon & Wed 3:00 PM - 4:30 PM" },
    { code: "EECS 2021", title: "Computer Organization", credits: "3.00", faculty: "Lassonde School of Engineering", description: "Study digital logic, computer architecture, and hardware components.", lecture: "Thu 10:00 AM - 1:00 PM" },
    { code: "ADMS 1000", title: "Introduction to Business", credits: "3.00", faculty: "Schulich School of Business", description: "Covers business fundamentals, marketing, management, and finance.", lecture: "Fri 1:00 PM - 4:00 PM" },
    { code: "HIST 1010", title: "World History Since 1500", credits: "6.00", faculty: "Faculty of Liberal Arts & Professional Studies", description: "Examine major global events shaping the modern world.", lecture: "Tue & Thu 6:00 PM - 7:30 PM" },
    { code: "SOSC 1350", title: "Introduction to Criminology", credits: "3.00", faculty: "Faculty of Liberal Arts & Professional Studies", description: "An interdisciplinary exploration of crime, justice, and society.", lecture: "Mon 5:00 PM - 8:00 PM" },
  ];

  const filteredCourses = courses.filter((course) => {
    return (
      (!filters.Faculty || course.faculty.includes(filters.Faculty)) &&
      (!filters.Credits || course.credits === filters.Credits)
    );
  });

  return (
    <div className="relative min-h-screen w-full bg-[#A42439] text-white flex flex-col items-center overflow-x-hidden">
      <section className="bg-[#A42439] pt-2 w-full">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent drop-shadow-lg text-center">
          Explore Your Electives
        </h1>
      </section>

      {/* Filter Bar */}
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
            <DropdownMenuContent className="bg-white/10 text-white border border-white/20 backdrop-blur-md">
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
          onClick={() => setFilters({ Faculty: "", Credits: "", Popularity: "" })}
          variant="secondary"
          className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
        >
          Clear Filters
        </Button>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl px-6 sm:px-10 pb-10">
        {filteredCourses.map((course, index) => (
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

      {/* Slide-In Info Panel */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 80 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl p-6 z-50 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{selectedCourse.code}</h2>
              <button onClick={() => setSelectedCourse(null)}>
                <X className="text-white w-6 h-6 hover:text-yellow-200" />
              </button>
            </div>
            <h3 className="text-lg text-yellow-100 mb-2">{selectedCourse.title}</h3>
            <p className="text-gray-200 text-sm mb-4">{selectedCourse.description}</p>
            <p className="text-gray-300 text-sm mb-2">
              <strong>Faculty:</strong> {selectedCourse.faculty}
            </p>
            <p className="text-gray-300 text-sm mb-2">
              <strong>Credits:</strong> {selectedCourse.credits}
            </p>
            <p className="text-gray-300 text-sm">
              <strong>Lecture:</strong> {selectedCourse.lecture}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Electives;