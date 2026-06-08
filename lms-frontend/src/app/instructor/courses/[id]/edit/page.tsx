"use client";

import { useParams } from "next/navigation";
import InstructorCourseForm from "../../../components/InstructorCourseForm";

export default function EditInstructorCoursePage() {
  const params = useParams();
  const courseId = Number(params.id);

  return <InstructorCourseForm courseId={courseId} />;
}
