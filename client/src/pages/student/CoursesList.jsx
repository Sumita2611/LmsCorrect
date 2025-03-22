import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import SearchBar from "../../components/student/SearchBar";
import { useParams } from "react-router-dom";
import CourseCard from "../../components/student/CourseCard";
import { assets } from "../../assets/assets";
import Footer from "../../components/student/Footer";
import Loading from "../../components/student/Loading";

const CoursesList = () => {
  const { navigate, allCourses } = useContext(AppContext);
  const { input } = useParams();
  const [filteredCourse, setFilteredCourse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("CoursesList - Current allCourses:", allCourses);

    try {
      setLoading(true);

      // Ensure allCourses is valid
      if (!allCourses) {
        console.warn("allCourses is null or undefined");
        setFilteredCourse([]);
        setError("No courses available");
        return;
      }

      if (!Array.isArray(allCourses)) {
        console.error("allCourses is not an array:", allCourses);
        setFilteredCourse([]);
        setError("Invalid courses data format");
        return;
      }

      console.log(`Processing ${allCourses.length} courses`);

      // Check for data structure issues
      const validCourses = allCourses.filter((course) => {
        if (!course || typeof course !== "object") {
          console.warn("Invalid course entry:", course);
          return false;
        }

        if (!course.courseTitle || typeof course.courseTitle !== "string") {
          console.warn("Course missing valid title:", course);
          return false;
        }

        return true;
      });

      console.log(
        `Found ${validCourses.length} valid courses out of ${allCourses.length}`
      );

      const tempCourses = validCourses.slice();

      // Apply search filtering if input exists
      if (input) {
        console.log(`Filtering courses by search term: "${input}"`);
        const searchResults = tempCourses.filter((item) =>
          item.courseTitle.toLowerCase().includes(input.toLowerCase())
        );

        console.log(
          `Found ${searchResults.length} courses matching "${input}"`
        );
        setFilteredCourse(searchResults);
      } else {
        console.log("Showing all courses (no filter)");
        setFilteredCourse(tempCourses);
      }

      setError(null);
    } catch (err) {
      console.error("Error processing courses:", err);
      setError("Error loading courses");
      setFilteredCourse([]);
    } finally {
      setLoading(false);
    }
  }, [allCourses, input]);

  if (loading) {
    return (
      <>
        <div className="relative md:px-36 px-8 pt-20 text-left">
          <div className="flex md:flex-row flex-col gap-6 items-start justify-between w-full">
            <div>
              <h1 className="text-4xl font-semibold text-gray-800">
                Course List
              </h1>
              <p className="text-gray-500">
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => navigate("/")}
                >
                  Home
                </span>{" "}
                / <span>Course List</span>
              </p>
            </div>
            <SearchBar data={input} />
          </div>
          <div className="py-16 flex justify-center">
            <Loading />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="relative md:px-36 px-8 pt-20 text-left">
        <div className="flex md:flex-row flex-col gap-6 items-start justify-between w-full">
          <div>
            <h1 className="text-4xl font-semibold text-gray-800">
              Course List
            </h1>
            <p className="text-gray-500">
              <span
                className="text-blue-600 cursor-pointer"
                onClick={() => navigate("/")}
              >
                Home
              </span>{" "}
              / <span>Course List</span>
            </p>
          </div>
          <SearchBar data={input} />
        </div>

        {input && (
          <div className="inline-flex items-center gap-4 px-4 py-2 border mt-8-mb-8 text-gray-600">
            <p>{input}</p>
            <img
              src={assets.cross_icon}
              alt=""
              className="cursor-pointer"
              onClick={() => navigate("/course-list")}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded my-4">
            {error}
          </div>
        )}

        {filteredCourse.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 px-2 md:p-0">
            {filteredCourse.map((course, index) => (
              <CourseCard key={course._id || index} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {input
                ? `No courses found matching "${input}"`
                : "No courses available at this time."}
            </p>
            {input && (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => navigate("/course-list")}
              >
                View All Courses
              </button>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default CoursesList;
