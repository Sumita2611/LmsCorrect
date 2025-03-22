import React from "react";

function Cards({item}) {
  return (
    <>
      <div className="card bg-base-100 w-96 cursor-pointer hover:scale-105 duration-200 dark:bg-slate-900 dark:text-white dark:border mt-10">
        <figure>
          <img
            className="h-80 rounded-lg"
            src="https://img.freepik.com/free-vector/hand-drawn-flat-design-stack-books-illustration_23-2149350216.jpg?t=st=1729761525~exp=1729765125~hmac=dc1a8016307f1ca9e47d87e1f6a27a13f579d852879bcc80c38316a2bb3dc217&w=740"
            alt="Shoes"
          />
        </figure>
        <div className="card-body">
          <h2 className="card-title">{item.name}</h2>
          <p className="">{item.description}</p>
          <div>
            <button className="text-red-600 font-semibold">
              {item.category}
            </button>
          </div>
          <div>$ {item.price}</div>
          <div className="card-actions justify-end">
            <button className="btn btn-primary">
              {item.price === 0 ? "Read" : "Buy"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Cards;
