/**
 * Cache Tags für Revalidation
 */

export function tagPage(slug: string): string {
  return `page:${slug}`;
}

export function tagPages(): string {
  return "pages";
}

export function tagCourses(): string {
  return "courses";
}

export function tagCourse(id: string): string {
  return `course:${id}`;
}

export function tagVideoCourses(): string {
  return "video-courses";
}

export function tagVideoCourse(id: string): string {
  return `videoCourse:${id}`;
}





