import React from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Banner from "./components/Banner";
import Freebook from "./components/Freebook";
import Footer from "./components/Footer";
import Buy from "./components/Buy";
import Courses from "./courses/courses";
import Homepage from "./components/Homepage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/courses" element={<Courses />} />
    </Routes>
  );
};

export default App;