import { motion } from "framer-motion";
import { X } from "lucide-react";
import { TermSection } from "./TermSection";

export function CourseDetailPanel({ course, onClose }) {
  if (!course) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 80 }}
      className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl p-6 z-50 flex flex-col overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#A42439]/60 backdrop-blur-md p-2 rounded">
        <h2 className="text-xl font-bold text-white">{course.code}</h2>
        <button onClick={onClose}>
          <X className="text-white w-6 h-6 hover:text-yellow-200" />
        </button>
      </div>

      <h3 className="text-lg text-yellow-100 mb-2">{course.title}</h3>
      <p className="text-gray-200 text-sm mb-4">{course.description}</p>

      <p className="text-gray-300 text-sm mb-2">
        <strong>Faculty:</strong> {course.faculty}
      </p>
      <p className="text-gray-300 text-sm mb-2">
        <strong>Credits:</strong> {course.credits}
      </p>

      <p className="text-sm text-yellow-100 italic mb-5">
        Note: Always double check if you need permission from an instructor to enroll into this course.
      </p>

      {course.terms?.length > 0 && (
        <div className="mt-4 space-y-6">
          <h4 className="text-yellow-200 font-semibold mb-2">
            Sections & Instructors:
          </h4>

          {course.terms.some((t) => t.term === "F") && (
            <TermSection
              title="🍂 Fall"
              color="text-yellow-300"
              terms={course.terms.filter((t) => t.term === "F")}
            />
          )}

          {course.terms.some((t) => t.term === "W") && (
            <TermSection
              title="❄️ Winter"
              color="text-blue-300"
              terms={course.terms.filter((t) => t.term === "W")}
            />
          )}

          {course.terms.filter((t) => !["F", "W"].includes(t.term)).length > 0 && (
            <TermSection
              title="📘 Other / Year-Long"
              color="text-green-300"
              terms={course.terms.filter((t) => !["F", "W"].includes(t.term))}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}