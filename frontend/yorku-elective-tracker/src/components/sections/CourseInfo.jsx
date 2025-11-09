import { motion } from "framer-motion";
import { X } from "lucide-react";

const CourseInfoPanel = ({ course, onClose }) => {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 80 }}
      className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl p-6 z-50 flex flex-col overflow-y-auto"
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

      {course.terms?.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-yellow-200 font-semibold mb-2">
            Sections & Instructors:
          </h4>
          {course.terms.map((term, idx) => (
            <div
              key={idx}
              className="bg-white/10 p-3 rounded-lg border border-white/20"
            >
              <p className="text-sm text-gray-100 mb-1">
                <strong>Term: {term.label}</strong> — Section {term.section}
              </p>
              <ul className="text-xs text-gray-200 list-disc ml-4">
                {term.meetings.map((m, i) => (
                  <li key={i}>
                    {m.type}: {m.firstName || "TBA"} {m.lastName || ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CourseInfoPanel;
