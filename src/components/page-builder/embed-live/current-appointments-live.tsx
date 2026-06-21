"use client";

import { CurrentAppointmentsBlockData } from "@/lib/page-builder/types";
import CurrentAppointmentsBlockView from "@/components/courses/current-appointments-block-view";
import { usePublishedCourses } from "./use-published-courses";
import { EmbedError, EmbedSkeleton } from "./embed-status";

/** Live-Variante des Aktuelle-Termine-Blocks für den WYSIWYG-Builder. */
export default function CurrentAppointmentsLive({
  data,
}: {
  data: CurrentAppointmentsBlockData;
}) {
  const { courses, error } = usePublishedCourses();
  if (error) return <EmbedError message={error} />;
  if (!courses) return <EmbedSkeleton label="Aktuelle Termine" />;
  return <CurrentAppointmentsBlockView data={data} courses={courses} />;
}
