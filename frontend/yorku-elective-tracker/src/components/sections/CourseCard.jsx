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
        rounded-2xl
        bg-white/70 backdrop-blur-xl
        border border-white/40
        shadow-xl
        hover:shadow-2xl hover:border-white/60
        hover:scale-[1.05]
        transition-all duration-300 ease-out
        overflow-hidden
        hover:-translate-y-2
      "
    >
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-200/20 to-transparent rounded-full blur-3xl" />
      
      {/* Popularity badge - floating top right */}
      {popularity && (
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg font-bold text-white backdrop-blur-sm">
            <Flame className="w-3.5 h-3.5 text-yellow-100" />
            <span className="text-xs">{popularity.toFixed(0)}</span>
          </div>
        </div>
      )}
      
      <CardHeader className="relative z-10 pb-2 pt-6 px-5">
        <CardTitle className="text-lg font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent mb-2 pr-12">
          {course.code}
        </CardTitle>
        
        <CardDescription className="text-slate-700 text-sm font-semibold line-clamp-2 leading-relaxed">
          {course.title}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-3 px-5 pb-5">
        {/* Credits & Faculty in clean layout */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg border border-blue-200/50">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">{course.credits}</span>
            </div>
            <span className="text-xs font-medium text-slate-600 truncate flex-1">
              {course.faculty}
            </span>
          </div>
        </div>

        {/* Instructor Card */}
        <div className="pt-2">
          {topInstructor ? (
            <div className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-purple-100/50 to-pink-100/50 rounded-lg border border-purple-200/50 group-hover:border-purple-300/70 transition-colors">
              <div className="p-1 bg-white rounded-md shadow-sm">
                <User className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-purple-600 font-bold uppercase tracking-wide mb-0.5 opacity-75">
                  Professor
                </p>
                <p className="text-xs text-slate-800 font-semibold truncate">
                  {topInstructor.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-slate-100/50 to-gray-100/50 rounded-lg border border-slate-200/50">
              <div className="p-1 bg-white rounded-md shadow-sm">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wide mb-0.5">
                  Professor
                </p>
                <p className="text-xs text-slate-600 font-medium italic">
                  TBA
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hover hint */}
        <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <p className="text-center text-[10px] font-semibold text-blue-600">
            Click for details ✨
          </p>
        </div>
      </CardContent>

      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}

export default CourseCard;