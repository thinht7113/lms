"use client";

import { useParams } from "next/navigation";
import InstructorLessonForm from "../../../../../../components/InstructorLessonForm";

export default function CreateInstructorLessonPage() {
  const params = useParams();
  return (
    <InstructorLessonForm
      courseId={Number(params.id)}
      sectionId={Number(params.sectionId)}
    />
  );
}
