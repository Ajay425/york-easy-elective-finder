import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const CoursesPage = () => {
  const courses = [
    {
      code: "EECS 1011",
      title: "Introduction to Programming",
      description: "Learn the basics of programming using Python and problem-solving techniques.",
      credits: "3.00",
      faculty: "Lassonde School of Engineering",
    },
    {
      code: "EECS 2030",
      title: "Advanced Object-Oriented Programming",
      description: "Covers design patterns, Java, and software engineering principles.",
      credits: "3.00",
      faculty: "Lassonde School of Engineering",
    },
    {
      code: "MATH 1013",
      title: "Calculus I",
      description: "An introduction to limits, derivatives, and integrals with real-world applications.",
      credits: "3.00",
      faculty: "Faculty of Science",
    },
    {
      code: "MATH 1025",
      title: "Applied Linear Algebra",
      description: "Explore matrices, vectors, and transformations for practical computation.",
      credits: "3.00",
      faculty: "Faculty of Science",
    },
    {
      code: "PSYC 1010",
      title: "Introduction to Psychology",
      description: "Explore key psychological theories and concepts through scientific study.",
      credits: "6.00",
      faculty: "Faculty of Health",
    },
    {
      code: "PHIL 1000",
      title: "Introduction to Philosophy",
      description: "Investigate questions about knowledge, existence, and ethics.",
      credits: "3.00",
      faculty: "Faculty of Liberal Arts & Professional Studies",
    },
    {
      code: "HUMA 1200",
      title: "Understanding Literature",
      description: "An overview of literary genres, themes, and critical reading methods.",
      credits: "3.00",
      faculty: "Faculty of Liberal Arts & Professional Studies",
    },
    {
      code: "SOSC 1350",
      title: "Introduction to Criminology",
      description: "An interdisciplinary exploration of crime, justice, and society.",
      credits: "3.00",
      faculty: "Faculty of Liberal Arts & Professional Studies",
    },
    {
      code: "ECON 1000",
      title: "Introduction to Microeconomics",
      description: "Understand how individuals and firms make economic decisions.",
      credits: "3.00",
      faculty: "Faculty of Liberal Arts & Professional Studies",
    },
    {
      code: "EECS 2021",
      title: "Computer Organization",
      description: "Study digital logic, computer architecture, and hardware components.",
      credits: "3.00",
      faculty: "Lassonde School of Engineering",
    },
    {
      code: "HIST 1010",
      title: "World History Since 1500",
      description: "Examine major global events shaping the modern world.",
      credits: "6.00",
      faculty: "Faculty of Liberal Arts & Professional Studies",
    },
    {
      code: "ADMS 1000",
      title: "Introduction to Business",
      description: "Covers business fundamentals, marketing, management, and finance.",
      credits: "3.00",
      faculty: "Schulich School of Business",
    },
  ];

  return (
    <section className="min-h-screen bg-[#A42439] flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-10 bg-gradient-to-r from-yellow-200 via-white to-yellow-100 bg-clip-text text-transparent">
        Explore Your Electives
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {courses.map((course, index) => (
          <Card
            key={index}
            className="rounded-2xl border border-[#ffffff20] shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-[#fdfdfd] to-[#f7e6e6] hover:from-[#fff5f5] hover:to-[#ffeaea] transform hover:-translate-y-1"
          >
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#A42439] tracking-tight">
                {course.code}
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium text-sm">
                {course.title}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-gray-700 text-sm mb-3">{course.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  <strong>Credits:</strong> {course.credits}
                </span>
                <span className="bg-[#A42439]/10 text-[#A42439] px-2 py-1 rounded-full font-semibold text-[10px]">
                  {course.faculty.split(" ")[0]}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
    </section>
  );
};

export default CoursesPage;
