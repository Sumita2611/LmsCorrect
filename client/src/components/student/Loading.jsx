import React, { useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const Loading = () => {
  const navigate = useNavigate();
  const { path } = useParams();
  const { clearPurchasingCourse } = useContext(AppContext);

  useEffect(() => {
    console.log(`Loading component mounted. Redirecting to ${path || "home"}`);

    // If we're redirecting to my-enrollments, we should keep the purchasing state
    // to allow the MyEnrollments component to verify enrollment
    const isEnrollmentRedirect = path === "my-enrollments";

    if (isEnrollmentRedirect) {
      console.log(
        "Redirecting to enrollments page - keeping purchasing state for verification"
      );
      // Don't clear purchasing state, let MyEnrollments handle it
    } else {
      // Clear any purchasing state for other redirects
      console.log("Clearing purchasing state for non-enrollment redirect");
      localStorage.removeItem("purchasingCourseId");
      localStorage.removeItem("enrollmentAttemptTime");
      if (typeof clearPurchasingCourse === "function") {
        clearPurchasingCourse();
      }
    }

    // Show a success message
    toast.success("Operation successful! Redirecting...");

    // Set a simple redirect timeout
    const redirectTimeout = setTimeout(() => {
      if (path) {
        navigate(`/${path}`);
      } else {
        navigate("/");
      }
    }, 2000);

    // Cleanup
    return () => clearTimeout(redirectTimeout);
  }, [path, navigate, clearPurchasingCourse]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin mb-4"></div>

      <p className="text-gray-700 font-medium mt-4 text-center">
        Redirecting...
      </p>

      <p className="text-gray-400 text-sm mt-2 text-center">
        Going to {path || "home"} shortly
      </p>
    </div>
  );
};

export default Loading;
