import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { Line } from "rc-progress";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";

const MyEnrollments = () => {
  const {
    enrolledCourses,
    navigate,
    calculateNoOfLectures,
    getToken,
    backendUrl,
    fetchUserEnrolledCourses,
    clearPurchasingCourse,
    checkEnrollmentStatusAPI,
  } = useContext(AppContext);

  const location = useLocation();

  const [progressArray, setProgressArray] = useState([
    { lectureCompleted: 2, totalLectures: 4 },
    { lectureCompleted: 1, totalLectures: 5 },
    { lectureCompleted: 3, totalLectures: 6 },
    { lectureCompleted: 4, totalLectures: 4 },
    { lectureCompleted: 0, totalLectures: 3 },
    { lectureCompleted: 5, totalLectures: 7 },
    { lectureCompleted: 6, totalLectures: 8 },
    { lectureCompleted: 2, totalLectures: 6 },
    { lectureCompleted: 4, totalLectures: 10 },
    { lectureCompleted: 3, totalLectures: 5 },
    { lectureCompleted: 7, totalLectures: 7 },
    { lectureCompleted: 1, totalLectures: 4 },
    { lectureCompleted: 0, totalLectures: 2 },
    { lectureCompleted: 5, totalLectures: 5 },
  ]);

  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Simple initialization useEffect
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("No authentication token available");
          setLoadError(true);
          return;
        }

        // Check for a course that was being purchased
        const storedCourseId = localStorage.getItem("purchasingCourseId");

        // Load enrollments
        await fetchUserEnrolledCourses(token);

        // Check enrollment status if needed
        if (
          storedCourseId &&
          enrolledCourses.some((course) => course._id === storedCourseId)
        ) {
          toast.success("Successfully enrolled in the course!");
          localStorage.removeItem("purchasingCourseId");
          localStorage.removeItem("enrollmentAttemptTime");
          if (typeof clearPurchasingCourse === "function") {
            clearPurchasingCourse();
          }
        } else if (storedCourseId) {
          // Try a direct enrollment check
          try {
            const status = await checkEnrollmentStatusAPI(storedCourseId);
            if (status.success && status.isEnrolled) {
              toast.success("Successfully enrolled in the course!");
              await fetchUserEnrolledCourses(token);
            }
          } catch (error) {
            console.error("Error checking enrollment:", error);
          }

          // Clear purchasing state regardless
          localStorage.removeItem("purchasingCourseId");
          localStorage.removeItem("enrollmentAttemptTime");
          if (typeof clearPurchasingCourse === "function") {
            clearPurchasingCourse();
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        setLoadError(true);
      } finally {
        setInitialized(true);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    // In a real implementation, this would fetch progress data from the API
    // For now, we're using the mock data, but we ensure each course has a progress entry
    const updatedProgressArray = enrolledCourses.map((course, index) => {
      // If we already have progress data for this index, use it, otherwise create a new entry
      if (progressArray[index]) {
        return progressArray[index];
      }

      // Create default progress for new courses
      const totalLectures = calculateNoOfLectures(course);
      return {
        lectureCompleted: 0,
        totalLectures,
      };
    });

    setProgressArray(updatedProgressArray);
  }, [enrolledCourses, calculateNoOfLectures, progressArray]);

  // Calculate percentage completion
  const calculatePercentage = (completed, total) => {
    if (!total) return 0;
    const percentage = (completed / total) * 100;
    return Math.round(percentage);
  };

  // Determine button text based on progress
  const getButtonText = (completed, total) => {
    if (completed === 0) return "Start";
    if (completed === total) return "Completed";
    return "Resume";
  };

  // Handle remove course button click
  const handleRemoveClick = (course) => {
    setCourseToRemove(course);
    setShowRemoveConfirm(true);
  };

  // Close the confirmation dialog
  const closeRemoveConfirm = () => {
    setShowRemoveConfirm(false);
    setCourseToRemove(null);
  };

  // Function to manually trigger refresh
  const handleManualRefresh = async () => {
    setRefreshing(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication error. Please login again.");
      }

      await fetchUserEnrolledCourses(token);
      toast.success("Courses refreshed successfully");
    } catch (error) {
      console.error("Error refreshing courses:", error);
      toast.error("Failed to refresh courses. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Confirm and process course removal
  const confirmRemove = async () => {
    if (!courseToRemove) return;

    try {
      setRemoveLoading(true);
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication error. Please login again.");
      }

      const response = await fetch(`${backendUrl}/api/user/unenroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: courseToRemove._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Course removed successfully");
        // Refresh the enrollment data
        await fetchUserEnrolledCourses(token);
      } else {
        throw new Error(data.message || "Failed to remove course");
      }
    } catch (error) {
      console.error("Error removing course:", error);
      toast.error(error.message || "Failed to remove course");
    } finally {
      setRemoveLoading(false);
      closeRemoveConfirm();
    }
  };

  if (!initialized) {
    return (
      <div className="w-full h-full px-4 md:px-10 py-8">
        <div className="w-full flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 mb-4">Initializing your courses...</p>
          <button
            onClick={() => setInitialized(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
          >
            Skip Initialization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full h-full px-4 md:px-10 py-8">
        {/* Page header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
              My Enrolled Courses
            </h1>
            <p className="text-gray-600 mt-1">
              Track and continue your learning journey
            </p>
          </div>

          {enrolledCourses.length > 0 && (
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
            >
              {refreshing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          )}
        </div>

        {/* Error state */}
        {loadError && (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Error Loading Courses
            </h2>
            <p className="text-gray-600 mb-6">
              We're having trouble loading your enrolled courses.
            </p>
            <button
              onClick={handleManualRefresh}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* No courses state */}
        {!loadError && enrolledCourses.length === 0 && (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No Enrolled Courses
            </h2>
            <p className="text-gray-600 mb-6">
              You haven't enrolled in any courses yet.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Browse Courses
            </button>
          </div>
        )}

        {/* Course grid */}
        {enrolledCourses.length > 0 && !loadError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course, index) => (
              <div
                key={course._id}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-md"
              >
                <img
                  src={course.courseThumbnail}
                  alt={course.courseTitle}
                  className="w-full h-48 object-cover"
                />
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                    {course.courseTitle}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {course.courseShortDesc}
                  </p>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>
                        {progressArray[index]?.lectureCompleted || 0} /{" "}
                        {progressArray[index]?.totalLectures || 0} lectures
                      </span>
                      <span>
                        {calculatePercentage(
                          progressArray[index]?.lectureCompleted || 0,
                          progressArray[index]?.totalLectures || 0
                        )}
                        %
                      </span>
                    </div>
                    <Line
                      percent={calculatePercentage(
                        progressArray[index]?.lectureCompleted || 0,
                        progressArray[index]?.totalLectures || 0
                      )}
                      strokeWidth={1.5}
                      strokeColor="#4F46E5"
                      trailWidth={1.5}
                      trailColor="#E5E7EB"
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => navigate(`/view-course/${course._id}`)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
                    >
                      {getButtonText(
                        progressArray[index]?.lectureCompleted || 0,
                        progressArray[index]?.totalLectures || 0
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveClick(course)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove course"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation dialog for removing course */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Remove Course
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove "{courseToRemove?.courseTitle}"
              from your enrolled courses? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeRemoveConfirm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={removeLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                disabled={removeLoading}
              >
                {removeLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyEnrollments;
