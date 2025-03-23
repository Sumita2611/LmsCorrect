import React from "react";

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-700 font-medium mt-4 text-center">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
