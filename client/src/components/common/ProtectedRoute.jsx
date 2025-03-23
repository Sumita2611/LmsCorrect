import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";

const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    console.log("ProtectedRoute: checking authentication...");

    // Mark that we're checking auth and not to redirect away
    localStorage.setItem("checking_auth", "true");

    // Setup a timeout to prevent UI from hanging indefinitely
    const timeoutId = setTimeout(() => {
      setChecking(false);
      localStorage.removeItem("checking_auth");
    }, 2000);

    // If auth state is loaded, we can make our decision right away
    if (isLoaded) {
      console.log("ProtectedRoute: Auth loaded, signed in:", isSignedIn);
      clearTimeout(timeoutId);
      setChecking(false);
      localStorage.removeItem("checking_auth");
    }

    return () => {
      clearTimeout(timeoutId);
      localStorage.removeItem("checking_auth");
    };
  }, [isLoaded, isSignedIn]);

  // Show nothing while checking to prevent flash of content
  if (checking || !isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 font-medium mt-4 text-center">
          Checking authentication...
        </p>
      </div>
    );
  }

  // If the user isn't signed in, redirect to the login page
  if (!isSignedIn) {
    console.log("ProtectedRoute: Not signed in, redirecting");
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // If we have a user with educator role, render the children
  console.log("ProtectedRoute: User authenticated, rendering children");
  return children;
};

export default ProtectedRoute;
