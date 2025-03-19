import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const { getToken } = useAuth();
  const { user } = useUser();

  const [allCourses, setAllCourses] = useState([]);
  const [isEducator, setIsEducator] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [userData, setUserData] = useState(null);

  // Function to directly enroll in a course (local state only)
  const directEnroll = (courseId) => {
    console.log(`Enrolling in course ${courseId} (local state only)`);

    // Find the course in allCourses
    const courseToEnroll = allCourses.find((course) => course._id === courseId);

    if (!courseToEnroll) {
      console.error(`Course ${courseId} not found in available courses`);
      return false;
    }

    // Check if already enrolled
    if (enrolledCourses.some((course) => course._id === courseId)) {
      console.log(`Already enrolled in course ${courseId}`);
      return true;
    }

    // Add to enrolled courses
    setEnrolledCourses((prev) => [...prev, courseToEnroll]);

    // Store in localStorage to persist across refreshes
    try {
      // Get existing enrolled course IDs from localStorage
      const existingIds = JSON.parse(
        localStorage.getItem("enrolledCourseIds") || "[]"
      );

      // Add the new course ID if it's not already there
      if (!existingIds.includes(courseId)) {
        existingIds.push(courseId);
        localStorage.setItem("enrolledCourseIds", JSON.stringify(existingIds));
      }
    } catch (error) {
      console.error("Error saving enrollment to localStorage:", error);
    }

    console.log(`Successfully enrolled in course ${courseId}`);
    return true;
  };

  // Function to remove a course from enrollments
  const removeEnrollment = (courseId) => {
    console.log(`Removing course ${courseId} from enrollments`);

    // Update state
    setEnrolledCourses((prev) =>
      prev.filter((course) => course._id !== courseId)
    );

    // Update localStorage
    try {
      const existingIds = JSON.parse(
        localStorage.getItem("enrolledCourseIds") || "[]"
      );
      const updatedIds = existingIds.filter((id) => id !== courseId);
      localStorage.setItem("enrolledCourseIds", JSON.stringify(updatedIds));
    } catch (error) {
      console.error("Error updating localStorage:", error);
    }

    return true;
  };

  // Function to check if a user is enrolled in a course
  const isEnrolledInCourse = (courseId) => {
    if (!enrolledCourses || enrolledCourses.length === 0) return false;
    return enrolledCourses.some((course) => course._id === courseId);
  };

  //Fetch all courses
  const fetchAllCourses = async () => {
    try {
      console.log("Fetching all courses from API");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/courses`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Fetched ${data.courses ? data.courses.length : 0} courses from API`
      );

      if (data.success && data.courses && data.courses.length > 0) {
        setAllCourses(data.courses);
      } else {
        console.warn("No courses found or API returned empty data");
        // Fallback to dummy data if API fails
        setAllCourses(dummyCourses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      // Fallback to dummy data if API fails
      setAllCourses(dummyCourses);
    }
  };

  //Function to calculate average rating of course
  const calculateRating = (course) => {
    if (course.courseRatings.length === 0) {
      return 0;
    }
    let totalRating = 0;
    course.courseRatings.forEach((rating) => {
      totalRating += rating.rating;
    });
    return totalRating / course.courseRatings.length;
  };

  //Function to calculate Course Chapter time
  const calculateChapterTime = (chapter) => {
    let time = 0;
    chapter.chapterContent.map((lecture) => (time += lecture.lectureDuration));
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  //Function to calculate Course duration
  const calculateCourseDuration = (course) => {
    let time = 0;

    course.courseContent.map((chapter) =>
      chapter.chapterContent.map((lecture) => (time += lecture.lectureDuration))
    );
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  //Function to calculte total number of lectures in the course
  const calculateNoOfLectures = (course) => {
    let totalLectures = 0;
    course.courseContent.forEach((chapter) => {
      if (Array.isArray(chapter.chapterContent)) {
        totalLectures += chapter.chapterContent.length;
      }
    });
    return totalLectures;
  };

  // Fetch user data and enrolled courses
  const fetchUserData = async () => {
    if (!user) return;

    try {
      const token = await getToken();
      console.log(
        "Fetching user data with token:",
        token ? token.substring(0, 10) + "..." : "No token"
      );

      if (!token) {
        console.error("No authentication token available");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          cache: "no-store",
        }
      );

      const data = await response.json();
      console.log("User data response:", data);

      if (data.success) {
        setUserData(data.user);
      } else {
        console.error("Failed to fetch user data:", data.message);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Load enrolled courses from localStorage
  useEffect(() => {
    // Load enrolled course IDs from localStorage
    try {
      const storedCourseIds = JSON.parse(
        localStorage.getItem("enrolledCourseIds") || "[]"
      );

      if (storedCourseIds.length > 0 && allCourses.length > 0) {
        console.log(`Found ${storedCourseIds.length} stored enrolled courses`);

        // Get the full course objects for the stored IDs
        const storedCourses = allCourses.filter((course) =>
          storedCourseIds.includes(course._id)
        );

        if (storedCourses.length > 0) {
          console.log(
            `Loaded ${storedCourses.length} courses from localStorage`
          );
          setEnrolledCourses(storedCourses);
        }
      }
    } catch (error) {
      console.error("Error loading enrolled courses from localStorage:", error);
    }
  }, [allCourses]);

  useEffect(() => {
    fetchAllCourses();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const value = {
    currency,
    allCourses,
    navigate,
    calculateRating,
    isEducator,
    setIsEducator,
    calculateNoOfLectures,
    calculateCourseDuration,
    calculateChapterTime,
    enrolledCourses,
    setEnrolledCourses,
    userData,
    getToken,
    backendUrl: import.meta.env.VITE_API_URL,
    fetchAllCourses,
    isEnrolledInCourse,
    directEnroll,
    removeEnrollment,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};
