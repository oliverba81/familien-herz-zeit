import { getPublishedCoursesSerializable } from "@/lib/courses/published-courses";
import { CurrentAppointmentsBlockData } from "@/lib/page-builder/types";
import CurrentAppointmentsBlockView from "./current-appointments-block-view";

/**
 * Server-Wrapper: lädt die veröffentlichten Kurse und rendert die reine
 * Client-View. Die identische View wird im WYSIWYG-Builder live verwendet.
 */
export default async function CurrentAppointmentsBlock({
  data,
}: {
  data: CurrentAppointmentsBlockData;
}) {
  const courses = await getPublishedCoursesSerializable();
  return <CurrentAppointmentsBlockView data={data} courses={courses} />;
}
