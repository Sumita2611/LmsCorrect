import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import axios from "axios";
import { assets } from "../../assets/assets";
import { toast } from "react-toastify";

const MyCourses = () => {
  const { currency, getToken, backendUrl, navigate } = useContext(AppContext);

  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchEducatorCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();

      if (!token) {
        throw new Error("Authentication error. Please login again.");
      }

      console.log("Fetching educator courses...");
      const response = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Educator courses response:", response.data);

      if (response.data.success) {
        setCourses(response.data.courses);
      } else {
        throw new Error(response.data.message || "Failed to fetch courses");
      }
    } catch (error) {
      console.error("Error fetching educator courses:", error);
      setError(error.message || "Failed to fetch courses");
      toast.error("Failed to load your courses. Please try again.");
      // Fallback to empty array to show "No courses found" message
      setCourses([]);
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
    console.log("MyCourses component mounted - fetching courses");
    fetchEducatorCourses();

    // Try to reload all courses when navigating from addCourse
    const urlParams = new URLSearchParams(window.location.search);
    const fromAdd = urlParams.get("fromAdd");
    if (fromAdd === "true") {
      console.log("Detected navigation from add course - refreshing data");
      setTimeout(() => {
        fetchEducatorCourses();
      }, 500);
    }
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className="w-full">
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
            Error: {error}
          </div>
        )}

        {!courses || courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-white">
            <p className="text-lg text-gray-600 mb-4">
              You haven't created any courses yet
            </p>
            <button
              onClick={() => navigate("/educator/add-course")}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >
              Create Your First Course
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
            <table className="md:table-auto table-fixed w-full overflow-hidden">
              <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold truncate">
                    All Courses
                  </th>
                  <th className="px-4 py-3 font-semibold truncate">Price</th>
                  <th className="px-4 py-3 font-semibold truncate">Students</th>
                  <th className="px-4 py-3 font-semibold truncate">
                    Published On
                  </th>
                  <th className="px-4 py-3 font-semibold truncate">Actions</th>
                </tr>
              </thead>

              <tbody className="text-sm text-gray-500">
                {courses.map((course) => (
                  <tr key={course._id} className="border-b border-gray-500/20">
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                      <img
                        src={course.courseThumbnail}
                        alt="Course Image"
                        className="w-16 h-12 object-cover"
                      />
                      <span className="truncate pl-2">
                        {course.courseTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {currency}{" "}
                      {(
                        course.coursePrice -
                        (course.discount * course.coursePrice) / 100
                      ).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {course.enrolledStudents
                        ? course.enrolledStudents.length
                        : 0}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteClick(course)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && courseToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Delete Course</h3>
            <p className="mb-6">
              Are you sure you want to delete "{courseToDelete.courseTitle}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
