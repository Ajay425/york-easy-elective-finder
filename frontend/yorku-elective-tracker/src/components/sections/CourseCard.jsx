import {
  Card,
} from "@/components/ui/card";

export function CourseCard({ course, selectedTerm, onClick }) {

  // 1. Compute term-based popularity safely
  const computeTermPopularity = () => {
    if (!selectedTerm || !course.terms) return null;
    const offering = course.terms.find((t) => t.term === selectedTerm);
    if (!offering) return null;

    const pops = offering.meetings
      ?.map((m) => m.popularity)
      ?.filter((p) => p !== undefined && p !== null);

    return pops?.length ? Math.max(...pops) : null;
  };

  const termPopularity = computeTermPopularity();

  // 2. Compute term-based instructor
  const getTermInstructor = () => {
    if (!selectedTerm || !course.terms) return null;

    const offering = course.terms.find((t) => t.term === selectedTerm);
    if (!offering || !offering.meetings) return null;

    const valid = offering.meetings.find(
      (m) => m.firstName && m.firstName !== "TBA"
    );

    if (valid) {
      return {
        name: `${valid.firstName} ${valid.lastName}`,
        popularity: valid.popularity,
      };
    }
    return null;
  };

  const termInstructor = getTermInstructor();

  // 3. Fallback (original logic)
  const getFallbackInstructor = () => {
    for (const term of course.terms || []) {
      for (const meeting of term.meetings || []) {
        if (meeting.firstName && meeting.firstName !== "TBA") {
          return {
            name: `${meeting.firstName} ${meeting.lastName}`,
            popularity: meeting.popularity,
          };
        }
      }
    }
    return null;
  };

  const fallbackInstructor = getFallbackInstructor();

  // 4. Check if online option is available for selected term
  const hasOnlineOption = () => {
    if (!selectedTerm || !course.terms) return false;
    const offering = course.terms.find((t) => t.term === selectedTerm);
    if (!offering || !offering.meetings) return false;
    return offering.meetings.some((m) => m.type === "ONLN" || m.type === "ONCA" || m.type === "HYFX");
  };

  const isOnlineAvailable = hasOnlineOption();

  // 5. Final values (term -> fallback -> course)
  const topInstructor = termInstructor || fallbackInstructor;
  const popularity =
    termPopularity ??
    termInstructor?.popularity ??
    fallbackInstructor?.popularity ??
    course.topInstructorPopularity;

  return (
    <Card
      onClick={onClick}
      className="
        group relative cursor-pointer h-full rounded-2xl
        bg-gradient-to-br from-gray-800/40 via-gray-900/40 to-black/40
        backdrop-blur-xl border border-white/5 shadow-lg shadow-black/20
        hover:border-[#7f5af0]/30 hover:shadow-2xl hover:shadow-[#7f5af0]/10
        hover:translate-y-[-4px] transition-all duration-300 ease-out overflow-hidden
      "
    >
      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      {/* Popularity badge */}
      {popularity && (
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            ★ {Number(popularity).toFixed(1)}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-6 h-full flex flex-col">
        {/* Course Code */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-[#7f5af0] group-hover:to-[#a855f7] transition-all duration-300">
            {course.code}
          </h3>
        </div>

        {/* Title */}
        <div className="mb-5 flex-1">
          <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed group-hover:text-white transition-colors duration-300">
            {course.title}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

        {/* Info Section */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Credits</span>
            <span className="text-sm text-[#7f5af0] font-semibold">{course.credits}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Faculty</span>
            <span className="text-xs text-gray-400 truncate max-w-[60%] text-right">
              {course.faculty}
            </span>
          </div>
          {isOnlineAvailable && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Format</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-200 rounded-full">
                🌐 Online Available
              </span>
            </div>
          )}
        </div>

        {/* Instructor */}
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
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  TOP Instructor
                </p>
                <p className="text-sm text-white font-medium truncate">{topInstructor.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-500 text-lg">?</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Instructor
                </p>
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
