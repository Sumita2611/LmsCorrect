import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";

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
  const [purchasingCourse, setPurchasingCourse] = useState(null);
  const [lastEnrollmentAttempt, setLastEnrollmentAttempt] = useState(null);

  // Function to mark a course as being purchased
  const markCourseAsPurchasing = (courseId) => {
    console.log(`Marking course ${courseId} as being purchased`);

    // Save to both state and localStorage for persistence across page reloads
    setPurchasingCourse(courseId);
    setLastEnrollmentAttempt(new Date().toISOString());

    localStorage.setItem("purchasingCourseId", courseId);
    localStorage.setItem("enrollmentAttemptTime", new Date().toISOString());
  };

  // Function to clear purchasing course state
  const clearPurchasingCourse = () => {
    console.log("Clearing purchasing course state");
    setPurchasingCourse(null);
    setLastEnrollmentAttempt(null);

    // Remove from localStorage - use both possible key names for maximum cleanup
    localStorage.removeItem("purchasingCourseId");
    localStorage.removeItem("purchasingCourse");
    localStorage.removeItem("enrollmentAttemptTime");
  };

  // Check if a course is currently being purchased
  const isCoursePurchasing = () => {
    return purchasingCourse !== null;
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

  // Function to manually check if a course is in enrolledCourses
  const isEnrolledInCourse = (courseId) => {
    if (!enrolledCourses || enrolledCourses.length === 0) return false;
    return enrolledCourses.some((course) => course._id === courseId);
  };

  // Function to check enrollment status directly from the API
  const checkEnrollmentStatusAPI = async (courseId) => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("No authentication token available");
        return {
          success: false,
          isEnrolled: false,
          error: "No authentication token",
        };
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/user/enrollment-status/${courseId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      return { success: false, isEnrolled: false, error: error.message };
    }
  };

  //Fetch user data and enrolled courses
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
        await fetchUserEnrolledCourses(token);
      } else {
        console.error("Failed to fetch user data:", data.message);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  //Fetch user enrolled courses
  const fetchUserEnrolledCourses = async (tokenParam) => {
    if (!user) return;

    try {
      const token = tokenParam || (await getToken());
      console.log(
        "Fetching enrolled courses with token:",
        token ? token.substring(0, 10) + "..." : "No token"
      );

      if (!token) {
        console.error("No authentication token available");
        return;
      }

      // Add a timestamp to avoid cached responses
      const timestamp = new Date().getTime();

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/user/enrolled-courses?_=${timestamp}`,
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
      console.log("Enrolled courses response:", data);

      if (data.success) {
        console.log(
          `Found ${data.enrolledCourses.length} enrolled courses:`,
          data.enrolledCourses.map((course) => course.courseTitle).join(", ")
        );
        setEnrolledCourses(data.enrolledCourses);

        // Check if the course being purchased is now in enrolled courses
        if (
          purchasingCourse &&
          data.enrolledCourses.some((course) => course._id === purchasingCourse)
        ) {
          console.log(
            `Course ${purchasingCourse} is now in enrolled courses, clearing purchasing state`
          );
          clearPurchasingCourse();
          toast.success("Successfully enrolled in the course!");
        }
      } else {
        console.error("Failed to fetch enrolled courses:", data.message);
        // Don't fallback to dummy data here, could confuse the user
      }
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      // Don't fallback to dummy data here, could confuse the user
    }
  };

  // Check for stored purchasing course on load
  useEffect(() => {
    const storedCourseId = localStorage.getItem("purchasingCourseId");
    const storedAttemptTime = localStorage.getItem("enrollmentAttemptTime");

    if (storedCourseId) {
      console.log(`Found stored purchasing course: ${storedCourseId}`);
      setPurchasingCourse(storedCourseId);
      setLastEnrollmentAttempt(storedAttemptTime);

      // Clear if it's been more than 24 hours
      if (storedAttemptTime) {
        const attemptTime = new Date(storedAttemptTime);
        const now = new Date();
        const hoursSinceAttempt = (now - attemptTime) / (1000 * 60 * 60);

        if (hoursSinceAttempt > 24) {
          console.log("Clearing stale purchasing course (older than 24 hours)");
          clearPurchasingCourse();
        }
      }
    }
  }, []);

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
    fetchUserEnrolledCourses,
    userData,
    getToken,
    backendUrl: import.meta.env.VITE_API_URL,
    fetchAllCourses,
    markCourseAsPurchasing,
    clearPurchasingCourse,
    isCoursePurchasing,
    purchasingCourse,
    isEnrolledInCourse,
    checkEnrollmentStatusAPI,
    fetchUserData,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};
