"use client";

import { useParams } from "next/navigation";
import InstructorLessonForm from "../../../../../../../components/InstructorLessonForm";

export default function EditInstructorLessonPage() {
  const params = useParams();
  return (
    <InstructorLessonForm
      courseId={Number(params.id)}
      sectionId={Number(params.sectionId)}
      lessonId={Number(params.lessonId)}
    />
  );
}
