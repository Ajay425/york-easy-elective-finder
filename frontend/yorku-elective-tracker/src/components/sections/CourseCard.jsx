import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Flame, GraduationCap, User } from "lucide-react";

export function CourseCard({ course, onClick }) {
  // Find first instructor with data across all terms
  const getTopInstructor = () => {
    for (const term of course.terms || []) {
      for (const meeting of term.meetings || []) {
        if (meeting.firstName && meeting.firstName !== "TBA") {
          return {
            name: `${meeting.firstName} ${meeting.lastName}`,
            popularity: meeting.popularity
          };
        }
      }
    }
    return null;
  };

  const topInstructor = getTopInstructor();
  const popularity = topInstructor?.popularity || course.topInstructorPopularity;
  
  return (
    <Card
      onClick={onClick}
      className="
        group relative
        cursor-pointer
        h-full
        rounded-lg
        bg-slate-800/80 backdrop-blur-md
        border border-cyan-500/30
        shadow-xl shadow-cyan-500/10
        hover:shadow-2xl hover:shadow-cyan-500/30 hover:border-cyan-400/60
        hover:scale-[1.03]
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
      
      {/* Popularity badge */}
      {popularity && (
        <div className="absolute top-3 right-3 z-20">
          <div className="px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 text-xs font-bold rounded-sm backdrop-blur-sm">
            ★ {popularity.toFixed(0)}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 p-5 h-full flex flex-col">
        
        {/* Course Code */}
        <div className="mb-3">
          <div className="text-xs text-cyan-400/60 font-bold tracking-widest uppercase mb-1">Course</div>
          <h3 className="text-xl font-black text-cyan-400 tracking-tight">
            {course.code}
          </h3>
        </div>

        {/* Title */}
        <div className="mb-4 flex-1">
          <p className="text-sm font-bold text-white/90 line-clamp-3 leading-snug">
            {course.title}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 mb-3" />

        {/* Info section */}
        <div className="space-y-2 mb-4">
          {/* Credits */}
          <div className="flex items-center gap-2 text-blue-300/80 text-xs font-semibold">
            <span className="text-blue-400">▸</span>
            <span>{course.credits} Credits</span>
          </div>
          
          {/* Faculty */}
          <div className="flex items-center gap-2 text-cyan-300/80 text-xs font-semibold line-clamp-1">
            <span className="text-cyan-400">▸</span>
            <span className="truncate">{course.faculty}</span>
          </div>
        </div>

        {/* Professor */}
        <div className="pt-3 border-t border-cyan-500/20">
          <div className="text-[9px] text-cyan-400/50 font-bold tracking-widest uppercase mb-1">
            Instructor
          </div>
          {topInstructor ? (
            <p className="text-xs text-cyan-300 font-bold truncate">
              {topInstructor.name}
            </p>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Unassigned
            </p>
          )}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-cyan-500/5 transition-all duration-300 pointer-events-none" />
      
      {/* Bottom glow on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}

export default CourseCard;