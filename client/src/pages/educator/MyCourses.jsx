import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import axios from "axios";
import { assets } from "../../assets/assets";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import useApi from "../../utils/api";

const MyCourses = () => {
  const { currency, getToken, backendUrl, navigate } = useContext(AppContext);
  const { isSignedIn, isLoaded, getToken: useAuthGetToken } = useAuth();
  const { user } = useUser();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { authFetch } = useApi();

  const fetchEducatorCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching educator courses from API...");
      console.log("Backend URL:", import.meta.env.VITE_API_URL);

      const data = await authFetch("/api/educator/courses");
      console.log("API response:", data);

      if (data && data.success && Array.isArray(data.courses)) {
        console.log(
          `Successfully loaded ${data.courses.length} courses from database`
        );
        if (data.courses.length > 0) {
          console.log("Course sample:", data.courses[0]);
        }
        setCourses(data.courses);
      } else {
        console.warn(
          "No courses found or invalid data format from educator endpoint"
        );
        console.log(
          "Attempting to fetch from general courses API as fallback..."
        );

        try {
          // Fallback to general courses endpoint
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/courses`
          );
          const generalData = await response.json();

          if (
            generalData &&
            generalData.success &&
            Array.isArray(generalData.courses)
          ) {
            console.log(
              `Fallback: Found ${generalData.courses.length} courses from general endpoint`
            );
            // Get the current user ID from Clerk
            if (isSignedIn) {
              // Filter courses by the current educator (if possible)
              // This is just a simple example - you might need to adapt based on your data structure
              const userCourses = generalData.courses.filter(
                (course) =>
                  course.educator &&
                  (course.educator._id === user?.id ||
                    course.educator.name === user?.fullName)
              );

              if (userCourses.length > 0) {
                console.log(
                  `Found ${userCourses.length} courses that might belong to current educator`
                );
                setCourses(userCourses);
                return;
              }
            }

            // If we can't filter properly, just show all courses as a last resort
            setCourses(generalData.courses);
          } else {
            console.warn("Fallback also failed, no courses found");
            setCourses([]);
            setError("No courses found. Create your first course!");
          }
        } catch (fallbackError) {
          console.error("Fallback fetch also failed:", fallbackError);
          setCourses([]);
          setError("No courses found. Create your first course!");
        }
      }
    } catch (error) {
      console.error("Error fetching educator courses:", error);
      console.log(
        "Attempting to fetch from general courses API as fallback..."
      );

      try {
        // Fallback to general courses endpoint
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/courses`
        );
        const generalData = await response.json();

        if (
          generalData &&
          generalData.success &&
          Array.isArray(generalData.courses)
        ) {
          console.log(
            `Fallback: Found ${generalData.courses.length} courses from general endpoint`
          );
          // If possible, filter by current educator, otherwise just show all
          setCourses(generalData.courses);
        } else {
          setError("No courses found. Create your first course!");
          setCourses([]);
        }
      } catch (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError);
        setError("Failed to load courses. Please refresh and try again.");
        setCourses([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (course) => {
    setCourseToDelete(course);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setCourseToDelete(null);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      setDeleteLoading(true);
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication error. Please login again.");
      }

      const response = await axios.delete(
        `${backendUrl}/api/educator/courses/${courseToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success("Course deleted successfully");
        // Remove the deleted course from state
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course._id !== courseToDelete._id)
        );
      } else {
        throw new Error(response.data.message || "Failed to delete course");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error(error.message || "Failed to delete course");
    } finally {
      setDeleteLoading(false);
      closeDeleteConfirm();
    }
  };

  useEffect(() => {
    console.log("MyCourses component mounted");

    // Check authentication first
    if (isLoaded && !isSignedIn) {
      navigate("/sign-in");
      return;
    }

    // Fetch educator courses from the API
    fetchEducatorCourses();

    // Try to reload all courses when navigating from addCourse
    const urlParams = new URLSearchParams(window.location.search);
    const fromAdd = urlParams.get("fromAdd");
    if (fromAdd === "true") {
      console.log("Detected navigation from add course - refreshing data");
      // Also fetch again after a slight delay in case the database update needs time
      setTimeout(() => {
        fetchEducatorCourses();
      }, 1000);
    }
  }, [isLoaded, isSignedIn]);

  if (loading) return <Loading />;

  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col pb-20 md:p-8 md:pb-20 p-4 pt-8">
      <div className="w-full flex-1">
        <div className="flex justify-between items-center pb-4">
          <h2 className="text-lg font-medium">My Courses</h2>
          <button
            onClick={() => navigate("/educator/add-course")}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <span>Add New Course</span>
            <img src={assets.add_icon} alt="Add" className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="text-red-500 mb-4 p-3 bg-red-100 rounded">
            {error}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">
              You haven't created any courses yet.
            </p>
            <button
              onClick={() => navigate("/educator/add-course")}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Create Your First Course
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-16 flex-shrink-0">
                          <img
                            className="h-12 w-16 object-cover rounded"
                            src={
                              course.courseThumbnail ||
                              "https://placehold.co/600x400?text=Course"
                            }
                            alt={course.courseTitle}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {course.courseTitle}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-1 max-w-xs">
                            {course.courseDescription}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {currency}
                        {(
                          course.coursePrice -
                          (course.discount * course.coursePrice) / 100
                        ).toFixed(2)}
                      </div>
                      {course.discount > 0 && (
                        <div className="text-xs text-green-600">
                          ({course.discount}% off)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {course.enrolledStudents?.length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() =>
                          navigate(`/educator/edit-course/${course._id}`)
                        }
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(course)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-3">Confirm Delete</h3>
            <p className="mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {courseToDelete?.courseTitle}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="px-4 py-2 border border-gray-300 rounded"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded flex items-center"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <span className="mr-2">Deleting</span>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
