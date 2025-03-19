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

  //Fetch all courses
  const fetchAllCourses = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/courses`
      );
      const data = await response.json();
      if (data.success) {
        setAllCourses(data.courses);
      } else {
        console.error("Failed to fetch courses:", data.message);
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
          },
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

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/enrolled-courses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log("Enrolled courses response:", data);

      if (data.success) {
        setEnrolledCourses(data.enrolledCourses);
      } else {
        console.error("Failed to fetch enrolled courses:", data.message);
        // Fallback to dummy data if API fails
        setEnrolledCourses(dummyCourses.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      // Fallback to dummy data if API fails
      setEnrolledCourses(dummyCourses.slice(0, 3));
    }
  };

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
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};