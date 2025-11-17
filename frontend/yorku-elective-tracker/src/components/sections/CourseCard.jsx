import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TrendingUp, Award, BookOpen } from "lucide-react";

export function CourseCard({ course, onClick }) {
  const popularity = course.topInstructorPopularity;
  
  return (
    <Card
      onClick={onClick}
      className="
        group relative
        cursor-pointer
        h-full
        rounded-2xl
        bg-gradient-to-br from-[#8B1538] to-[#6B0F2B]
        border border-white/20
        shadow-lg
        hover:shadow-2xl hover:border-yellow-400/50
        hover:scale-[1.03]
        transition-all duration-300 ease-out
        overflow-hidden
      "
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="relative z-10 pb-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20 flex-shrink-0">
              <BookOpen className="w-4 h-4 text-yellow-300" />
            </div>
            <CardTitle className="text-base font-bold text-white truncate">
              {course.code}
            </CardTitle>
          </div>
          
          {popularity && popularity >= 75 && (
            <div className="flex-shrink-0">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
          )}
        </div>
        
        <CardDescription className="text-gray-100 text-sm font-medium line-clamp-2 leading-snug">
          {course.title}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 rounded-lg px-3 py-2 border border-white/10">
            <p className="text-xs text-gray-400 mb-0.5">Credits</p>
            <p className="text-white font-bold text-sm">{course.credits}</p>
          </div>
          
          {popularity && (
            <div className="bg-black/20 rounded-lg px-3 py-2 border border-white/10">
              <p className="text-xs text-gray-400 mb-0.5">Rating</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                <p className="text-yellow-300 font-bold text-sm">{popularity.toFixed(0)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Faculty */}
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-gray-300 line-clamp-1">
            {course.faculty}
          </p>
        </div>

        {/* Instructor */}
        {course.topInstructorName && (
          <div className="pt-2 pb-1">
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
              <span className="text-xs text-yellow-200">Top Prof:</span>
              <span className="text-xs text-yellow-100 font-medium truncate">
                {course.topInstructorName}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Bottom indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400/0 via-yellow-400/50 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}

export default CourseCard;