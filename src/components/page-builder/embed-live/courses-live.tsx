"use client";

import { CoursesBlockData } from "@/lib/page-builder/types";
import CoursesBlockView from "@/components/courses/courses-block-view";
import { usePublishedCourses } from "./use-published-courses";
import { EmbedError, EmbedSkeleton } from "./embed-status";

/** Live-Variante des Kurse-&-Termine-Blocks für den WYSIWYG-Builder. */
export default function CoursesLive({ data }: { data: CoursesBlockData }) {
  const { courses, error } = usePublishedCourses();
  if (error) return <EmbedError message={error} />;
  if (!courses) return <EmbedSkeleton label="Kurse & Termine" />;
  return <CoursesBlockView data={data} courses={courses} />;
}
