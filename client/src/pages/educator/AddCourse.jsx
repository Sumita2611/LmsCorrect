import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { Line } from "rc-progress";
import Footer from "../../components/student/Footer";
import { toast } from "react-toastify";

const MyEnrollments = () => {
  const {
    enrolledCourses,
    calculateCourseDuration,
    navigate,
    calculateNoOfLectures,
    getToken,
    backendUrl,
  } = useContext(AppContext);

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
  const [localCourses, setLocalCourses] = useState([]);

  useEffect(() => {
    // In a real implementation, this would fetch progress data from the API
    const updatedProgressArray = enrolledCourses.map((course, index) => {
      if (progressArray[index]) {
        return progressArray[index];
      }

      const totalLectures = calculateNoOfLectures(course);
      return {
        lectureCompleted: 0,
        totalLectures,
      };
    });

    setProgressArray(updatedProgressArray);
    setLocalCourses(enrolledCourses);
  }, [enrolledCourses]);

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

  // Confirm and process course removal
  const confirmRemove = async () => {
    if (!courseToRemove) return;

    try {
      setRemoveLoading(true);

      const token = await getToken();
      if (!token) {
        toast.error("Authentication error. Please login again.");
        setRemoveLoading(false);
        closeRemoveConfirm();
        return;
      }

      console.log(`Attempting to unenroll from course: ${courseToRemove._id}`);

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
      console.log("Unenroll response:", data);

      if (data.success) {
        toast.success("Successfully unenrolled from the course");

        // Update local state to remove the course
        setLocalCourses((prev) =>
          prev.filter((course) => course._id !== courseToRemove._id)
        );
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

  return (
    <>
      <div className="md:px-36 px-8 pt-10">
        <h1 className="text-2xl font-semibold">My enrollments</h1>
        <table className="md:table-auto table-fixed w-full overflow-hidden border mt-10">
          <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left max-sm:hidden">
            <tr>
              <th className="px-4 py-3 font-semibold truncate">Course</th>
              <th className="px-4 py-3 font-semibold truncate">Duration</th>
              <th className="px-4 py-3 font-semibold truncate">Completed</th>
              <th className="px-4 py-3 font-semibold truncate">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {localCourses.map((course, index) => {
              const progress = progressArray[index] || {
                lectureCompleted: 0,
                totalLectures: calculateNoOfLectures(course),
              };
              const percentage = calculatePercentage(
                progress.lectureCompleted,
                progress.totalLectures
              );

              return (
                <tr key={course._id} className="border-b border-gray-500/20">
                  <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3">
                    <img
                      src={course.courseThumbnail}
                      alt=""
                      className="w-14 sm:w-24 md:w-28"
                    />
                    <div className="flex-1">
                      <p className="mb-1 max-sm:text-sm">
                        {course.courseTitle}
                      </p>
                      <div className="flex items-center">
                        <Line
                          strokeWidth={2}
                          percent={percentage}
                          className="bg-gray-300 rounded-full"
                          strokeColor={
                            percentage === 100 ? "#10B981" : "#3B82F6"
                          }
                        />
                        <span className="ml-2 text-sm font-medium">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-sm:hidden">
                    {calculateCourseDuration(course)}
                  </td>
                  <td className="px-4 py-3 max-sm:hidden">
                    {progress &&
                      `${progress.lectureCompleted} / ${progress.totalLectures}`}{" "}
                    <span>Lectures</span>
                  </td>
                  <td className="px-4 py-3 max-sm:text-right">
                    <div className="flex items-center space-x-2 justify-end">
                      <button
                        className={`px-3 sm:px-5 py-1.5 sm:py-2 max-sm:text-xs text-white ${
                          percentage === 100 ? "bg-green-500" : "bg-blue-600"
                        }`}
                        onClick={() => navigate("/player/" + course._id)}
                      >
                        {getButtonText(
                          progress.lectureCompleted,
                          progress.totalLectures
                        )}
                      </button>
                      <button
                        className="px-3 sm:px-5 py-1.5 sm:py-2 bg-red-500 max-sm:text-xs text-white"
                        onClick={() => handleRemoveClick(course)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {localCourses.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">
              You haven't enrolled in any courses yet.
            </p>
            <button
              className="px-5 py-2 bg-blue-600 text-white rounded"
              onClick={() => navigate("/course-list")}
            >
              Browse Courses
            </button>
          </div>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && courseToRemove && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Remove Course</h3>
            <p className="mb-6">
              Are you sure you want to remove "{courseToRemove.courseTitle}"
              from your enrollments?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeRemoveConfirm}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700"
                disabled={removeLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="px-4 py-2 bg-red-600 text-white rounded"
                disabled={removeLoading}
              >
                {removeLoading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default MyEnrollments;
