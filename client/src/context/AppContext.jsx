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
      console.log(
        "Fetching all courses from API:",
        import.meta.env.VITE_API_URL
      );

      try {
        console.log("Making fetch request to /api/courses");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/courses`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "omit",
            mode: "cors",
            cache: "no-cache",
          }
        );

        if (!response.ok) {
          console.error(
            `API error: ${response.status} - ${response.statusText}`
          );
          throw new Error(`API error: ${response.status}`);
        }

        // Try to parse response as JSON
        let data;
        try {
          const responseText = await response.text();
          console.log(
            "Raw API response:",
            responseText.substring(0, 200) + "..."
          );

          // Check if the response is HTML instead of JSON
          if (
            responseText.includes("<!DOCTYPE html>") ||
            responseText.includes("<html>")
          ) {
            console.error("Received HTML response instead of JSON");
            throw new Error("Invalid JSON response");
          }

          // Try to parse as JSON
          data = JSON.parse(responseText);
          console.log("API response data:", data);

          if (data.success && Array.isArray(data.courses)) {
            console.log(`Fetched ${data.courses.length} courses from API`);
            console.log("Source:", data.source || "unknown");

            // Log the first course to check structure
            if (data.courses.length > 0) {
              console.log("Sample course data:", data.courses[0]);
            }

            // Even if the array is empty, still set it
            setAllCourses(data.courses);
            console.log("Updated allCourses state with new data");
            return;
          } else {
            console.error("API response doesn't have expected format:", data);
            throw new Error("Invalid response format");
          }
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError);
          throw parseError;
        }
      } catch (apiError) {
        console.error("API call failed:", apiError);

        // Try with simplified approach - no headers
        try {
          console.log("Trying simplified fetch approach without headers...");
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/courses`,
            {
              method: "GET",
              mode: "cors",
              credentials: "omit",
              cache: "no-cache",
            }
          );

          if (!response.ok) {
            console.error(
              `Simplified fetch failed with status ${response.status}`
            );
            throw new Error(`API error: ${response.status}`);
          }

          // Try to get response as text first
          const responseText = await response.text();
          console.log(
            "Raw simplified response:",
            responseText.substring(0, 200) + "..."
          );

          // Parse text to JSON manually
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error(
              "Failed to parse simplified response as JSON:",
              parseError
            );
            throw parseError;
          }

          console.log("Simplified API response data:", data);

          if (data.success && Array.isArray(data.courses)) {
            setAllCourses(data.courses);
            console.log(
              "Successfully fetched courses with simplified approach"
            );
            return;
          } else {
            console.warn(
              "Simplified API returned invalid or empty response:",
              data
            );
            // Don't throw error for empty array
            setAllCourses([]);
            return;
          }
        } catch (simplifiedError) {
          console.error("Simplified fetch failed:", simplifiedError);
          console.error("CRITICAL: Failed to fetch courses from API");
          setAllCourses([]);
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      // Don't set dummy data, set empty array
      setAllCourses([]);
    }
  };

  // Add a useEffect to auto-refresh courses data
  useEffect(() => {
    // Initial fetch of all courses
    fetchAllCourses();

    // Set up interval to refresh courses more frequently
    const refreshInterval = setInterval(() => {
      fetchAllCourses();
    }, 10000); // Refresh every 10 seconds for real-time updates

    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

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

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/user/data`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "omit",
            mode: "cors",
            cache: "no-cache",
          }
        );

        if (!response.ok) {
          throw new Error(
            `API error: ${response.status} - ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("User data response:", data);

        if (data.success) {
          setUserData(data.user);
          console.log("Successfully loaded user data from database");
        } else {
          console.error("Failed to fetch user data:", data.message);
          throw new Error(data.message || "Failed to fetch user data");
        }
      } catch (apiError) {
        console.error("API call failed:", apiError);

        // Try with token as query param
        try {
          console.log("Trying simplified fetch approach with token param...");

          const tokenParam = encodeURIComponent(token);
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/user/data?token=${tokenParam}`,
            {
              method: "GET",
              mode: "cors",
              credentials: "omit",
              cache: "no-cache",
            }
          );

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            setUserData(data.user);
            console.log(
              "Successfully loaded user data with simplified approach"
            );
          } else {
            throw new Error(data.message || "Failed to fetch user data");
          }
        } catch (simplifiedError) {
          console.error("Simplified fetch failed:", simplifiedError);
          // Fall back to existing user data if available
          console.warn("Using cached user data");
        }
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
