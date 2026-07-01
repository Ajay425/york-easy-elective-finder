import { motion } from "framer-motion";
import { X, Copy, Check, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getCatEntryId } from "../../hooks/useSavedCatNumbers";

const MotionDiv = motion.div;

const DAY_LABELS = {
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  R: "Thursday",
  Th: "Thursday",
  F: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function CourseDetailPanel({
  course,
  selectedTerm,
  selectedTermLabel,
  onClose,
  savedCatIds,
  onSaveCatNumber,
  onRemoveCatNumber,
  highlightedCatId,
}) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Close panel on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!course) return null;

  // Filter term offerings based on selected term
  const termOfferings =
    course.terms?.filter((t) => t.term === selectedTerm) || [];

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveToggle = (offering) => {
    const id = getCatEntryId(course.code, offering);
    if (savedCatIds?.has(id)) {
      onRemoveCatNumber?.(id);
      return;
    }

    onSaveCatNumber?.(course, offering);
  };

  return (
    <MotionDiv
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 80 }}
      className="fixed top-0 right-0 h-full w-full sm:w-[420px] 
                 bg-white/10 backdrop-blur-2xl border-l border-white/20 
                 shadow-2xl p-6 z-50 flex flex-col overflow-y-auto"
    >
      {/* HEADER */}
      <div
        className="
          flex justify-between items-center mb-4 top-0
          bg-black/30 backdrop-blur-xl p-3 rounded-xl
          border border-white/20 shadow-lg
        "
      >
        <h2 className="text-xl font-bold text-white tracking-wide">
          {course.code}
        </h2>

        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 rounded-lg p-1.5 
                     border border-white/20 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* TITLE + DESC */}
      <h3 className="text-xl text-yellow-200 font-semibold mb-1">
        {course.title}
      </h3>

      <p className="text-gray-200/90 text-sm leading-relaxed mb-4">
        {course.description}
      </p>

      {/* COURSE INFO BOX */}
      <div className="bg-white/10 p-4 rounded-xl border border-white/20 shadow-inner space-y-2">
        <p className="text-gray-300 text-sm">
          <strong className="text-white">Faculty:</strong> {course.faculty}
        </p>
        <p className="text-gray-300 text-sm">
          <strong className="text-white">Credits:</strong> {course.credits}
        </p>
      </div>

      {/* NOTES */}
      <div className="mt-4 space-y-4 text-sm text-yellow-100">
        <p className="italic">
          Always double-check if you need permission from an instructor to enroll.
        </p>

        <p className="italic">
          To manually add this course visit{" "}
          <a
            href="https://wrem.sis.yorku.ca/Apps/WebObjects/REM.woa/wa/DirectAction/rem"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-300 underline"
          >
            REM
          </a>
        </p>

        <p className="italic">
          To map this course into VSB visit{" "}
          <a
            href="https://registrar.yorku.ca/enrol/guide/vsb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-300 underline"
          >
            Visual Schedule Builder
          </a>
        </p>
        <p className="italic">
          <a href="/contact-us" className="underline hover:text-[#7f5af0] transition-colors">Click Here to contact us for any course errors.</a>
        </p>
      </div>

      {/* TERM OFFERINGS */}
      {termOfferings.length > 0 && (
        <div className="mt-6 space-y-6">
          <h4 className="text-yellow-200 font-semibold text-lg">
            Sections for {selectedTermLabel || selectedTerm}
          </h4>

          {termOfferings.map((t, idx) => (
            <div
              key={idx}
              className={`bg-white/10 rounded-xl p-4 border backdrop-blur-xl shadow-lg ${
                highlightedCatId === getCatEntryId(course.code, t)
                  ? "border-yellow-200/70 shadow-yellow-300/10"
                  : "border-white/20"
              }`}
            >
              {/* Term + Cat Number */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-yellow-200 font-semibold text-sm">
                    Term: {t.term} — Section {t.section}
                  </p>

                  {t.catNumber && (
                    <p className="text-gray-200 text-sm mt-1">
                      <strong className="text-white">Cat Number:</strong>{" "}
                      <span className="font-mono">{t.catNumber}</span>
                    </p>
                  )}
                </div>

                {t.catNumber && (
                  <div className="relative flex flex-col gap-2 sm:items-end">
                    <Button
                      size="sm"
                      className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600
                                 border border-purple-400 text-white shadow-lg shadow-purple-500/50
                                 hover:shadow-purple-500/80 transition-all duration-200 hover:scale-105
                                 flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-semibold"
                      onClick={() => handleCopy(t.catNumber, idx)}
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy CAT
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      className={`border text-white shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-semibold ${
                        savedCatIds?.has(getCatEntryId(course.code, t))
                          ? "bg-green-500/20 border-green-300/50 hover:bg-green-500/30"
                          : "bg-white/10 border-white/20 hover:bg-white/20"
                      }`}
                      onClick={() => handleSaveToggle(t)}
                    >
                      {savedCatIds?.has(getCatEntryId(course.code, t)) ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          Save
                        </>
                      )}
                    </Button>
                  
                  {/* Confirmation Message */}
                  {copiedIndex === idx && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 right-0 bg-green-500 text-white text-xs 
                                 px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold 
                                 shadow-lg"
                    >
                      Cat Code in clipboard!
                    </MotionDiv>
                  )}
                  </div>
                )}
              </div>

              {/* COURSE TYPES */}
              {t.meetings?.length > 0 && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-gray-300 text-xs mb-2">
                    <strong className="text-white">Course Types:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(t.meetings.map((m) => m.type))).map((type) => {
                      const typeLabels = {
                        "LECT": "Lecture",
                        "TUTR": "Tutorial",
                        "LAB": "Lab",
                        "SEM": "Seminar",
                        "BLEN": "Blended",
                        "ONLN": "Online",
                        "ONCA": "Online Async",
                        "HYFX": "Hybrid"
                      };
                      return (
                        <span
                          key={type}
                          className="px-2 py-1 text-[10px] font-semibold bg-white/10 text-white rounded border border-white/20"
                        >
                          {typeLabels[type] || type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

{/* 🕒 TIMINGS SECTION */}
              {t.courseTimes && t.courseTimes.length > 0 ? (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-gray-300 text-xs mb-2">
                    <strong className="text-white">📅 Class Times:</strong>
                  </p>
                  <div className="space-y-1.5 text-xs">
                    {t.courseTimes.map((timing, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-200">
                        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-semibold min-w-fit text-[10px]">
                          {DAY_LABELS[timing.dayOfWeek] || timing.dayOfWeek}
                        </span>
                        <span className="text-gray-300">
                          {timing.startTime}
                          {timing.endTime ? ` – ${timing.endTime}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : t.meetings?.some((m) => m.dayOfWeek && m.startTime) ? (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-gray-300 text-xs mb-2">
                    <strong className="text-white">📅 Class Times:</strong>
                  </p>
                  <div className="space-y-1 text-sm text-gray-200">
                    {t.meetings.map((m, i) =>
                      m.dayOfWeek && m.startTime ? (
                        <div key={i} className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs">
                            {DAY_LABELS[m.dayOfWeek] || m.dayOfWeek}
                          </span>
                          <span className="text-xs">
                            {m.startTime}
                            {m.endTime ? ` – ${m.endTime}` : ""}
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ) : null}

              

              {/* INSTRUCTORS */}
              {t.meetings?.length > 0 ? (
                <div className="space-y-4">
                  {t.meetings.map((m, index) => (
                    <div
                      key={index}
                      className="bg-black/20 rounded-lg p-3 border border-white/10"
                    >
                      <p className="text-white text-sm font-semibold">
                        {m.firstName} {m.lastName}
                      </p>

                      {/* RMP Ratings */}
                      <div className="text-gray-300 text-xs mt-1 space-y-1">
                        <p>
                          ⭐ <strong>{m.avgRating ?? "N/A"}</strong> / 5
                        </p>
                        <p>
                          📘 Difficulty:{" "}
                          <strong>{m.avgDifficulty ?? "N/A"}</strong>
                        </p>
                        <p>
                          🔁 Would take again:{" "}
                          <strong>
                            {m.wouldTakeAgainPercent
                              ? `${m.wouldTakeAgainPercent}%`
                              : "N/A"}
                          </strong>
                        </p>
                        <p>
                          🧪 Ratings:{" "}
                          <strong>{m.numberOfRatings ?? "N/A"}</strong>
                        </p>
                      </div>

                      {/* RMP Link */}
                      {m.rateMyProfLink && (
                        <a
                          href={m.rateMyProfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-300 underline text-xs mt-2 inline-block"
                        >
                          View on RateMyProfessors →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-300 text-sm italic">
                  No instructor information available.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {termOfferings.length === 0 && (
        <div className="mt-6 text-center text-gray-300">
          <p>No sections offered for this term.</p>
        </div>
      )}
    </MotionDiv>
  );
}
