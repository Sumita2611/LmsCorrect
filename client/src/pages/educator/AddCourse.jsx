import React, { useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Quill from "quill";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";

const AddCourse = () => {
  const { backendUrl, navigate, fetchAllCourses } = useContext(AppContext);
  const { getToken } = useAuth();
  const { user } = useUser();
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [image, setImage] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lectureDetails, setLectureDetails] = useState({
    lectureTitle: "",
    lectureDuration: "",
    lectureUrl: "",
    isPreviewFree: false,
  });

  const handleChapter = (action, chapterId) => {
    if (action === "add") {
      const title = prompt("Enter Chapter Name:");
      if (title) {
        const newChapter = {
          chapterId: uuidv4(),
          chapterTitle: title,
          chapterContent: [],
          collapsed: false,
          chapterOrder:
            chapters.length > 0 ? chapters.slice(-1)[0].chapterOrder + 1 : 1,
        };
        setChapters([...chapters, newChapter]);
      }
    } else if (action === "remove") {
      setChapters(
        chapters.filter((chapter) => chapter.chapterId !== chapterId)
      );
    } else if (action === "toggle") {
      setChapters(
        chapters.map((chapter) =>
          chapter.chapterId === chapterId
            ? { ...chapter, collapsed: !chapter.collapsed }
            : chapter
        )
      );
    }
  };

  const handleLecture = (action, chapterId, lectureIndex) => {
    if (action === "add") {
      setCurrentChapterId(chapterId);
      setShowPopup(true);
    } else if (action === "remove") {
      setChapters(
        chapters.map((chapter) => {
          if (chapter.chapterId === chapterId) {
            const updatedContent = [...chapter.chapterContent];
            updatedContent.splice(lectureIndex, 1);
            return { ...chapter, chapterContent: updatedContent };
          }
          return chapter;
        })
      );
    }
  };

  const addLecture = () => {
    setChapters(
      chapters.map((chapter) => {
        if (chapter.chapterId === currentChapterId) {
          const newLecture = {
            ...lectureDetails,
            lectureOrder:
              chapter.chapterContent.length > 0
                ? chapter.chapterContent.slice(-1)[0].lectureOrder + 1
                : 1,
            lectureId: uuidv4(),
          };
          return {
            ...chapter,
            chapterContent: [...chapter.chapterContent, newLecture],
          };
        }
        return chapter;
      })
    );
    setShowPopup(false);
    setLectureDetails({
      lectureTitle: "",
      lectureDuration: "",
      lectureUrl: "",
      isPreviewFree: false,
    });
  };

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      setIsSubmitting(true);

      if (!user) {
        alert("You must be logged in to add a course");
        setIsSubmitting(false);
        return;
      }

      if (!image) {
        alert("Please select a thumbnail image for your course");
        setIsSubmitting(false);
        return;
      }

      if (!courseTitle.trim()) {
        alert("Please enter a course title");
        setIsSubmitting(false);
        return;
      }

      if (chapters.length === 0) {
        alert("Please add at least one chapter to your course");
        setIsSubmitting(false);
        return;
      }

      const courseData = {
        courseTitle,
        courseDescription: quillRef.current.root.innerHTML,
        coursePrice: Number(coursePrice),
        discount: Number(discount),
        courseContent: chapters,
        isPublished: true,
        educator: user.id,
      };

      console.log("User ID being set as educator:", user.id);

      // Create FormData instance
      const formData = new FormData();

      // Add course data as JSON string
      const courseDataJson = JSON.stringify(courseData);
      console.log("Course data being sent:", courseDataJson);
      formData.append("courseData", courseDataJson);

      // Add image file
      formData.append("image", image);

      // Add educator ID separately to ensure it's not lost
      formData.append("educatorId", user.id);

      console.log("Preparing to submit course with FormData");
      // Log form data entries for debugging
      for (let pair of formData.entries()) {
        console.log(
          pair[0],
          pair[1] instanceof File ? "File: " + pair[1].name : pair[1]
        );
      }

      // Get authentication token directly from Clerk
      let token;
      try {
        token = await getToken();
        console.log(
          "Authentication token obtained:",
          token ? "Yes (Length: " + token.length + ")" : "No"
        );
      } catch (tokenError) {
        console.error("Failed to get authentication token:", tokenError);
        alert("Authentication failed. Please sign in again.");
        setIsSubmitting(false);
        return;
      }

      if (!token) {
        alert("Authentication error. Please sign in again.");
        setIsSubmitting(false);
        return;
      }

      // Ensure backendUrl doesn't have trailing slash
      const apiBase = backendUrl.endsWith("/")
        ? backendUrl.slice(0, -1)
        : backendUrl;

      const submitUrl = `${apiBase}/api/educator/add-course`;

      console.log("Submitting course to:", submitUrl);
      console.log("Using auth token:", token.substring(0, 10) + "...");

      // Try with axios first
      try {
        console.log("Attempting submission with axios...");
        const axiosConfig = {
          headers: {
            Authorization: `Bearer ${token}`,
            // Let axios set the content type for FormData
          },
        };

        const axiosResponse = await axios.post(
          submitUrl,
          formData,
          axiosConfig
        );

        console.log("Axios response:", axiosResponse.data);

        if (axiosResponse.data.success) {
          // Clear form data on success
          setCourseTitle("");
          setCoursePrice(0);
          setDiscount(0);
          setImage(null);
          setChapters([]);
          quillRef.current.root.innerHTML = "";

          // Show success message
          alert("Course added successfully!");

          // Refresh course list
          fetchAllCourses();

          // Navigate back to my courses page
          navigate("/educator/my-courses?fromAdd=true");
          return;
        }
      } catch (axiosError) {
        console.error("Axios submission failed:", axiosError);
        console.log("Falling back to fetch API...");
      }

      // Fallback to fetch if axios fails
      try {
        // Use a basic fetch with minimal options for maximum compatibility
        const response = await fetch(
          `${submitUrl}?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              // Note: Do not set Content-Type header with FormData
            },
            body: formData,
            credentials: "include", // Include cookies if any
          }
        );

        let responseText;
        try {
          responseText = await response.text();
          console.log("Raw response:", responseText);
        } catch (e) {
          console.error("Couldn't read response text:", e);
        }

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        // Parse response if possible
        let data;
        try {
          data = JSON.parse(responseText);
          console.log("Parsed response:", data);
        } catch (parseError) {
          console.warn("Could not parse response as JSON:", parseError);
          // If we can't parse the response but the status was OK, assume success
          data = { success: true };
        }

        if (data && data.success) {
          // Clear form data on success
          setCourseTitle("");
          setCoursePrice(0);
          setDiscount(0);
          setImage(null);
          setChapters([]);
          quillRef.current.root.innerHTML = "";

          // Show success message
          alert("Course added successfully!");

          // Refresh course list
          fetchAllCourses();

          // Navigate back to my courses page
          navigate("/educator/my-courses?fromAdd=true");
        } else {
          throw new Error(data?.message || "Unknown error adding course");
        }
      } catch (fetchError) {
        console.error("Fetch submission also failed:", fetchError);
        console.log("Trying final fallback to general endpoint...");

        // Final attempt with general endpoint as last resort
        try {
          // Create a simpler request body format
          const simpleBody = {
            ...courseData,
            educatorId: user.id,
            // We can't send the image file in this format, so we'll use a placeholder
            courseThumbnail: "https://placehold.co/600x400?text=Course",
          };

          // Use the general courses endpoint as a last resort
          const fallbackResponse = await fetch(`${apiBase}/api/courses`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(simpleBody),
          });

          const fallbackData = await fallbackResponse.json();
          console.log("Fallback endpoint response:", fallbackData);

          if (fallbackResponse.ok) {
            // Clear form and redirect even if this worked
            setCourseTitle("");
            setCoursePrice(0);
            setDiscount(0);
            setImage(null);
            setChapters([]);
            quillRef.current.root.innerHTML = "";

            alert("Course may have been added via alternative method");
            fetchAllCourses();
            navigate("/educator/my-courses?fromAdd=true");
            return;
          } else {
            throw new Error(
              `Fallback API error: ${fallbackData.message || "Unknown error"}`
            );
          }
        } catch (fallbackError) {
          console.error("All submission attempts failed:", fallbackError);
          throw new Error(
            `All submission methods failed: ${fetchError.message}`
          );
        }
      }
    } catch (error) {
      console.error("Error adding course:", error);
      alert(`Failed to add course: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Initialize Quill only once
    if (!quillRef.current && editorRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            ["clean"],
          ],
        },
      });
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-180px)] overflow-scroll flex flex-col items-start justify-between md:p-8 md:pb-20 p-4 pt-8 pb-20">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md w-full text-gray-500"
      >
        <div className="flex flex-col gap-1">
          <p>Course Title</p>
          <input
            onChange={(e) => setCourseTitle(e.target.value)}
            value={courseTitle}
            type="text"
            placeholder="Type here"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <p>Course Description</p>
          <div ref={editorRef} className="min-h-[200px]"></div>
        </div>

        <div className="flex items-center justify-between flex-wrap">
          <div className="flex flex-col gap-1">
            <p>Course Price</p>
            <input
              onChange={(e) => setCoursePrice(e.target.value)}
              value={coursePrice}
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500"
              required
            />
          </div>

          <div className="flex md:flex-row flex-col items-center gap-3">
            <p>Course Thumbnail</p>
            <label htmlFor="thumbnailImage" className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded text-white cursor-pointer">
                Upload
              </div>
              <input
                type="file"
                id="thumbnailImage"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
                hidden
              />
              {image && (
                <img
                  className="max-h-10"
                  src={URL.createObjectURL(image)}
                  alt=""
                />
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p>Discount %</p>
          <input
            onChange={(e) => setDiscount(e.target.value)}
            value={discount}
            type="number"
            placeholder="0"
            min={0}
            max={100}
            className="outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500"
            required
          />
        </div>

        {/* Adding chapters and lectures */}
        <div>
          {chapters.map((chapter, chapterIndex) => (
            <div
              key={chapter.chapterId}
              className="bg-white border rounded-lg mb-4"
            >
              <div className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center">
                  <svg
                    onClick={() => handleChapter("toggle", chapter.chapterId)}
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 mr-2 cursor-pointer transition-all ${
                      chapter.collapsed ? "-rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span className="font-semibold">
                    {chapterIndex + 1} {chapter.chapterTitle}
                  </span>
                </div>
                <span className="text-gray-500">
                  {chapter.chapterContent.length} Lectures
                </span>
                <svg
                  onClick={() => handleChapter("remove", chapter.chapterId)}
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              {!chapter.collapsed && (
                <div className="p-4">
                  {chapter.chapterContent.map((lecture, lectureIndex) => (
                    <div
                      key={lecture.lectureId}
                      className="flex justify-between items-center mb-2"
                    >
                      <span>
                        {lectureIndex + 1} {lecture.lectureTitle} -{" "}
                        {lecture.lectureDuration} mins -{" "}
                        <a
                          href={lecture.lectureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500"
                        >
                          Link
                        </a>{" "}
                        - {lecture.isPreviewFree ? "Free Preview" : "Paid"}
                      </span>
                      <svg
                        onClick={() =>
                          handleLecture(
                            "remove",
                            chapter.chapterId,
                            lectureIndex
                          )
                        }
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 cursor-pointer"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  ))}
                  <div
                    className="inline-flex bg-gray-100 p-2 rounded cursor-pointer mt-2"
                    onClick={() => handleLecture("add", chapter.chapterId)}
                  >
                    + Add Lecture
                  </div>
                </div>
              )}
            </div>
          ))}
          <div
            className="flex justify-center items-center bg-blue-100 p-2 rounded-lg cursor-pointer"
            onClick={() => handleChapter("add")}
          >
            + Add Chapter
          </div>

          {showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
              <div className="bg-white text-gray-700 p-4 rounded relative w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Add Lecture</h2>

                <div className="mb-2">
                  <p>Lecture Title</p>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureTitle}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureTitle: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <p>Duration (minutes)</p>
                  <input
                    type="number"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureDuration}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureDuration: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-2">
                  <p>Lecture URL</p>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureUrl}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureUrl: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex gap-2 my-4">
                  <p>Is Preview Free?</p>
                  <input
                    type="checkbox"
                    className="mt-1 scale-125"
                    checked={lectureDetails.isPreviewFree}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        isPreviewFree: e.target.checked,
                      })
                    }
                  />
                </div>

                <button
                  type="button"
                  className="w-full bg-blue-400 text-white px-4 py-2 rounded"
                  onClick={addLecture}
                >
                  Add
                </button>

                <svg
                  onClick={() => setShowPopup(false)}
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute top-4 right-4 w-4 h-4 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${
            isSubmitting ? "bg-gray-500" : "bg-black"
          } text-white w-max py-2.5 px-8 rounded my-4`}
        >
          {isSubmitting ? "ADDING..." : "ADD"}
        </button>
      </form>
    </div>
  );
};

export default AddCourse;
