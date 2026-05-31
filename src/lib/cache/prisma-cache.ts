import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { tagPage, tagPages, tagCourse, tagCourses, tagVideoCourse, tagVideoCourses } from "@/lib/seo/tags";

/** Cache-Tag für Revalidierung bei Startseiten-Änderung */
export const HOMEPAGE_CACHE_TAG = "homepage";

/**
 * Cached Homepage Slug (from SiteSettings; fallback "home")
 */
async function getHomepageSlugUncached(): Promise<string> {
  const setting = await db.siteSettings.findUnique({
    where: { key: "homepage_slug" },
    select: { value: true },
  });
  return (setting?.value?.trim() as string) || "home";
}

export async function cachedHomepageSlug(): Promise<string> {
  return unstable_cache(
    getHomepageSlugUncached,
    ["homepage-slug"],
    { tags: [HOMEPAGE_CACHE_TAG], revalidate: 60 }
  )();
}

/**
 * Cached Homepage Page (Startseite) – lädt die konfigurierte oder fallback "home"
 */
export async function cachedHomepagePage() {
  return unstable_cache(
    async () => {
      const slug = await getHomepageSlugUncached();
      return db.page.findFirst({
        where: { slug, published: true },
        select: {
          id: true,
          title: true,
          slug: true,
          published: true,
          publishedContentJson: true,
          contentJson: true,
          showTitle: true,
          containerWidth: true,
          customCss: true,
          metaDescription: true,
          metaKeywords: true,
          ogImageUrl: true,
        },
      });
    },
    ["homepage-page"],
    { tags: [HOMEPAGE_CACHE_TAG, tagPages()], revalidate: 60 }
  )();
}

/**
 * Cached Page by Slug
 */
export async function cachedPageBySlug(slug: string) {
  return unstable_cache(
    async () => {
      return db.page.findFirst({
        where: {
          slug,
          published: true,
        },
        // Nur benötigte Felder selektieren für bessere Performance
        select: {
          id: true,
          title: true,
          slug: true,
          published: true,
          publishedContentJson: true,
          contentJson: true,
          showTitle: true,
          containerWidth: true,
          customCss: true,
          metaDescription: true,
          metaKeywords: true,
          ogImageUrl: true,
        },
      });
    },
    [`page-${slug}`],
    {
      tags: [tagPage(slug), tagPages()],
      revalidate: 60, // 1 minute - kürzer für schnellere Updates
    }
  )();
}

/**
 * Cached Course by ID
 */
export async function cachedCourseById(id: string) {
  return unstable_cache(
    async () => {
      return db.course.findUnique({
        where: { id },
        include: {
          sessions: {
            orderBy: {
              startAt: "asc",
            },
          },
          series: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              bookings: {
                where: {
                  status: {
                    in: ["PENDING", "CONFIRMED"],
                  },
                },
              },
            },
          },
        },
      });
    },
    [`course-${id}`],
    {
      tags: [tagCourse(id), tagCourses()],
      revalidate: 3600, // 1 hour
    }
  )();
}

/**
 * Cached VideoCourse by ID
 */
export async function cachedVideoCourseById(id: string) {
  return unstable_cache(
    async () => {
      return db.videoCourse.findUnique({
        where: { id },
      });
    },
    [`videoCourse-${id}`],
    {
      tags: [tagVideoCourse(id), tagVideoCourses()],
      revalidate: 3600, // 1 hour
    }
  )();
}

/**
 * Cached published Pages list (for sitemap)
 */
export async function cachedPublishedPages() {
  return unstable_cache(
    async () => {
      return db.page.findMany({
        where: { published: true },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    },
    ["published-pages"],
    {
      tags: [tagPages()],
      revalidate: 3600, // 1 hour
    }
  )();
}




