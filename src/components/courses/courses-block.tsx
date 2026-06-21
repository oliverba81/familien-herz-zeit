import { getPublishedCoursesSerializable } from "@/lib/courses/published-courses";
import { CoursesBlockData } from "@/lib/page-builder/types";
import CoursesBlockView from "./courses-block-view";

/**
 * Server-Wrapper: lädt die veröffentlichten Kurse und rendert die reine
 * Client-View. Die identische View wird im WYSIWYG-Builder live verwendet,
 * damit Editor und veröffentlichte Seite gleich aussehen.
 */
export default async function CoursesBlock({ data }: { data: CoursesBlockData }) {
  const courses = await getPublishedCoursesSerializable();
  return <CoursesBlockView data={data} courses={courses} />;
}
