import { Route, Routes } from "react-router-dom";
import Currencies from "./components/Currencies";
import Home from "./components/Home";
import "./index.css";
  
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/currencies" element={<Currencies />} />
    </Routes>
  );
}

export default App;