import React, { useState, useEffect } from "react";
import districtsData from "./districts.json"; // Adjust the path if needed

const Home = () => {
  const [state, setState] = useState("");
  const [districts, setDistricts] = useState([]);

  const handleStateChange = (event) => {
    const selectedState = event.target.value;
    setState(selectedState);
    setDistricts(districtsData[selectedState] || []);
  };

  return (
    <div className="flex justify-center items-center flex-row p-20 gap-10">
      <div>
        <label htmlFor="state" className="mr-2">
          State:
        </label>
        <select
          id="state"
          value={state}
          onChange={handleStateChange}
          className="p-2 border"
        >
          <option value="">--Select--</option>
          {Object.keys(districtsData).map((stateName) => (
            <option key={stateName} value={stateName}>
              {stateName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="district" className="mr-2">
          District:
        </label>
        <select id="district" className="p-2 border">
          <option value="">--Select--</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dateFrom" className="mr-2">
          Date From:
        </label>
        <input type="date" id="dateFrom" className="p-2 border" />
      </div>
      <div>
        <label htmlFor="dateTo" className="mr-2">
          Date To:
        </label>
        <input type="date" id="dateTo" className="p-2 border" />
      </div>
    </div>
  );
};

export default Home;