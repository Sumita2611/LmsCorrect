import React from "react";
import list from "../../public/list.json";
import Cards from "./Cards";
import { Link } from "react-router-dom";

const Buy = () => {
  const filterData = list.filter((data) => data.category !== "Free");
  return (
    <>
      <div className="max-w-screen-2xl container mx-auto md:px-20 px-4 mt-20">
        <div className="pl-10 pt-5">
          <Link to="/">
            <img
              className="w-6 h-6 cursor-pointer"
              src="../src/assets/arrow.png"
              alt=""
            />
          </Link>
        </div>
        <div className="flex flex-wrap">
          {filterData.map((item) => (
            <Cards item={item} key={item.id} />
          ))}
        </div>
      </div>
    </>
  );
};

export default Buy;
