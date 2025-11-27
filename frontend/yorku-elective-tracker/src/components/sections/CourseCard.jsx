import {
  Card,
} from "@/components/ui/card";
import { GraduationCap, Users, Flame } from "lucide-react";

export function CourseCard({ course, selectedTerm, onClick }) {

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

  const hasOnlineOption = () => {
    if (!selectedTerm || !course.terms) return false;
    const offering = course.terms.find((t) => t.term === selectedTerm);
    if (!offering || !offering.meetings) return false;
    return offering.meetings.some((m) => m.type === "ONLN" || m.type === "ONCA" || m.type === "HYFX");
  };

  const isOnlineAvailable = hasOnlineOption();

  const topInstructor = termInstructor || fallbackInstructor;
  const popularity =
    termPopularity ??
    termInstructor?.popularity ??
    fallbackInstructor?.popularity ??
    course.topInstructorPopularity;

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