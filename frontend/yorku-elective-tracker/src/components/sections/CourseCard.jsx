import {
  Card,
} from "@/components/ui/card";
import { GraduationCap, Users, Flame } from "lucide-react";

export function CourseCard({ course, selectedTerm, onClick }) {

  const termMatchesSelection = (term, selection) => {
    if (!selection) return true;
    return term === selection || term?.startsWith(selection);
  };

  // Build a comparable instructor summary from a meeting row
  const getInstructorFromMeeting = (meeting) => {
    if (!meeting) return null;

    const first = (meeting.firstName || "").trim();
    const last = (meeting.lastName || "").trim();

    // Invalid if no first name or it's TBA
    if (!first || first.toUpperCase() === "TBA") return null;

    const fullName = last ? `${first} ${last}` : first;

    return {
      name: fullName,
      popularity: meeting.popularity ?? null,
      avgRating: meeting.avgRating ?? null,
      numberOfRatings: meeting.numberOfRatings ?? null,
    };
  };

  const compareInstructors = (a, b) => {
    const popularityDiff = (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0);
    if (popularityDiff !== 0) return popularityDiff;

    const ratingDiff = (Number(b?.avgRating) || 0) - (Number(a?.avgRating) || 0);
    if (ratingDiff !== 0) return ratingDiff;

    return (Number(b?.numberOfRatings) || 0) - (Number(a?.numberOfRatings) || 0);
  };

  // Find the strongest instructor signal in a specific offering
  const findInstructorInTerm = (term) => {
    if (!term?.meetings) return null;

    const instructors = term.meetings
      .map((m) => getInstructorFromMeeting(m))
      .filter(Boolean)
      .sort(compareInstructors);

    return instructors[0] || null;
  };

  // Main instructor selector
  const getInstructor = (course, selectedTerm) => {
    if (!course?.terms) return null;

    // 1️⃣ If a term is selected: ONLY look at that term
    if (selectedTerm) {
      const instructors = course.terms
        .filter((t) => termMatchesSelection(t.term, selectedTerm))
        .map((term) => findInstructorInTerm(term))
        .filter(Boolean)
        .sort(compareInstructors);

      return instructors[0] || null;
    }

    // 2️⃣ If no term selected: search all terms for any valid instructor
    for (const term of course.terms) {
      const inst = findInstructorInTerm(term);
      if (inst) return inst;
    }

    return null;
  };

  // Popularity selection
  const getPopularity = (course, selectedTerm) => {
    if (!course?.terms) return null;

    // 1️⃣ If a term is selected: ONLY use that term's popularity values
    if (selectedTerm) {
      const pops = course.terms
        .filter((t) => termMatchesSelection(t.term, selectedTerm))
        .flatMap((term) => term.meetings || [])
        .map((m) => m.popularity)
        .filter((p) => p !== undefined && p !== null);

      return pops.length ? Math.max(...pops) : null;
    }

    // 2️⃣ If NO term selected: compute max across all terms
    let maxPop = null;
    for (const term of course.terms) {
      for (const m of term.meetings || []) {
        const p = m.popularity;
        if (p !== undefined && p !== null) {
          maxPop = maxPop === null ? p : Math.max(maxPop, p);
        }
      }
    }

    if (maxPop !== null) return maxPop;

    // 3️⃣ Final fallback: course-level field if you really want it
    return course.topInstructorPopularity ?? null;
  };

  // Detect online availability
  const ONLINE_TYPES = ["ONLN", "ONCA", "ONCB", "HYFX", "REM", "REM1", "HYBR"]; 

  const isOnline = (course, selectedTerm) => {
    if (!course?.terms) return false;

    // Must check ONLY the chosen term
    const terms = course.terms.filter((t) => termMatchesSelection(t.term, selectedTerm));
    if (!terms.length) return false;

    // Checks exact meeting types ONLY (no substring accidents)
    return terms.some((term) =>
      term.meetings?.some((m) =>
        ONLINE_TYPES.includes((m.type || "").trim().toUpperCase())
      )
    );
  };




  const topInstructor = getInstructor(course, selectedTerm);
  const popularity = getPopularity(course, selectedTerm);
  const isOnlineAvailable = isOnline(course, selectedTerm);


  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer h-full rounded-2xl bg-gradient-to-br from-gray-800/40 via-gray-900/40 to-black/40
        backdrop-blur-xl border border-white/5 shadow-lg shadow-black/20
        hover:border-[#7f5af0]/30 hover:shadow-2xl hover:shadow-[#7f5af0]/10
        hover:translate-y-[-4px] transition-all duration-300 ease-out overflow-hidden
      "
    >
      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      {/* Content */}
      <div className="relative z-10 p-6 h-full flex flex-col">
        {/* Header Section */}
        <div className="mb-4">
          {/* Course Code with Credits badge */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-[#7f5af0] group-hover:to-[#a855f7] transition-all duration-300">
              {course.code}
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7f5af0]/20 rounded-lg border border-[#7f5af0]/30">
              <GraduationCap className="w-3.5 h-3.5 text-[#7f5af0]" />
              <span className="text-sm text-white font-semibold">{course.credits}</span>
            </div>
          </div>

          {/* Popularity bar */}
          {popularity && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Popularity</span>
                </div>
                <span className="text-sm text-white font-bold">{popularity}/100</span>
              </div>
              <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${popularity}%` }}
                />
              </div>
            </div>
          )}

          {/* Online badge */}
          {isOnlineAvailable && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-full">
              <span className="text-xs font-semibold text-blue-300">🌐 Online Available</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="mb-4 flex-1">
          <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed group-hover:text-white transition-colors duration-300">
            {course.title}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

        {/* Faculty */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Faculty</p>
          <p className="text-xs text-gray-300">
            {course.faculty}
          </p>
        </div>

        {/* Instructor Section */}
        <div className="mt-auto pt-4 border-t border-white/5">
          {topInstructor ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7f5af0] to-[#ec4899] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {topInstructor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3 h-3 text-gray-500" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Top Instructor
                  </p>
                </div>
                <p className="text-sm text-white font-medium truncate">{topInstructor.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 text-lg">?</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3 h-3 text-gray-500" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Instructor
                  </p>
                </div>
                <p className="text-sm text-gray-500 italic">To be announced</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#7f5af0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}

export default CourseCard;
