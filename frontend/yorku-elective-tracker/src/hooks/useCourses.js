import { useState, useEffect } from "react";
import { buildCoursesURL } from "../lib/courseFilters";

const FACULTY_NAMES = {
  "SB": "Schulich School of Business",
  "AP": "Faculty of Liberal Arts & Professional Studies",
  "SC": "Faculty of Science",
  "LE": "Lassonde School of Engineering",
  "ED": "Faculty of Education"
};

export function useCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
  console.log('Course data sample:', courses[0]);
  console.log('First course terms:', courses[0]?.terms);
  console.log('First term courseTimes:', courses[0]?.terms?.[0]?.courseTimes);
  console.log('First meeting:', courses[0]?.terms?.[0]?.meetings?.[0]);
}, [courses]);

  useEffect(() => {
    setLoading(true);
    fetch(buildCoursesURL())
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch courses');
        return res.json();
      })
      .then((responseData) => {
        const data = responseData.courses;

        if (!data || !Array.isArray(data)) {
          throw new Error('Invalid data format');
        }

        // Debug: Log the raw backend data structure
        if (data.length > 0) {
          console.log('🔍 RAW BACKEND DATA - First course:', JSON.stringify(data[0], null, 2));
          console.log('🔍 First offering:', data[0].courseOfferings?.[0]);
          console.log('🔍 Course times in first offering:', data[0].courseOfferings?.[0]?.courseTimes);
          console.log('🔍 Instructors in first offering:', data[0].courseOfferings?.[0]?.instructors);
        }

        const formatted = data.map((c) => ({
          code: `${c.faculty}/${c.deptAcronym} ${c.courseCode}`,
          title: c.name,
          credits: c.credit.toFixed(2),
          faculty: FACULTY_NAMES[c.faculty] || "Other",
          year: c.year,
          deptAcronym: c.deptAcronym,
          description: c.desc || "",
          topInstructorPopularity: c.courseOfferings?.[0]?.instructors?.[0]?.instructor?.popularity,
          topInstructorName: c.courseOfferings?.[0]?.instructors?.[0]?.instructor
            ? `${c.courseOfferings[0].instructors[0].instructor.firstname} ${c.courseOfferings[0].instructors[0].instructor.lastname}`
            : null,
          terms: (c.courseOfferings || []).map((offering) => ({
            term: offering.term,
            section: offering.section,
            catNumber: offering.catNumber,
            courseTimes: offering.courseTimes || [], // 🔍 Add courseTimes from backend
            meetings: (offering.instructors || []).map((io, idx) => ({
              type: offering.type,
              firstName: io.instructor?.firstname || "TBA",
              lastName: io.instructor?.lastname || "",
              avgRating: io.instructor?.avgRating,
              avgDifficulty: io.instructor?.avgDifficulty,
              wouldTakeAgainPercent: io.instructor?.wouldTakeAgainPercent,
              numberOfRatings: io.instructor?.numberOfRatings,
              rateMyProfLink: io.instructor?.rateMyProfLink,
              popularity: io.instructor?.popularity

              // Removed: dayOfWeek, startTime, endTime, durationMinutes
              // These come from courseTimes array, not per-instructor
            })),
          })),
        }));

        setCourses(formatted);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load courses:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { courses, loading, error };
}