import CourseCard from "./CourseCard";

const CourseGrid = ({ courses, onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl px-6 sm:px-10 pb-10">
      {courses.map((course) => (
        <CourseCard key={course.code} course={course} onSelect={onSelect} />
      ))}
    </div>
  );
};

export default CourseGrid;
