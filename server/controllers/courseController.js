import Course from "../models/Course.js";

//Get All Courses
export const getAllCourse = async (req, res) => {
  try {
    console.log("Fetching all courses");
    const courses = await Course.find({ isPublished: true })
      .select("-courseContent.chapterContent.lectureUrl") // Don't send all lecture URLs
      .populate({ path: "educator", select: "name imageUrl" })
      .lean();

    console.log(`Found ${courses.length} published courses`);
    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Error fetching all courses:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get course by id
export const getCourseId = async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`Fetching course with ID: ${id}`);
    const courseData = await Course.findById(id)
      .populate({ path: "educator", select: "name imageUrl" })
      .lean();

    if (!courseData) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Remove lectureUrl if isPreviewFree is False
    if (courseData.courseContent) {
      courseData.courseContent.forEach((chapter) => {
        if (chapter.chapterContent) {
          chapter.chapterContent.forEach((lecture) => {
            if (!lecture.isPreviewFree) {
              lecture.lectureUrl = "";
            }
          });
        }
      });
    }

    console.log(`Successfully fetched course: ${courseData.courseTitle}`);
    return res.status(200).json({
      success: true,
      courseData,
    });
  } catch (error) {
    console.error(`Error fetching course with ID ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
