import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function CourseCard({ course, onClick }) {
  return (
    <Card
      onClick={onClick}
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
        <p className="text-gray-300 text-sm mb-3">Credits: {course.credits}</p>
        <p className="text-gray-300 text-xs mb-2">Faculty: {course.faculty}</p>

        {course.topInstructorPopularity && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-yellow-200 text-sm font-semibold">
              🔥 Popularity: {course.topInstructorPopularity.toFixed(0)}/100
            </p>
            {course.topInstructorName && (
              <p className="text-gray-300 text-xs italic">
                {course.topInstructorName}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}