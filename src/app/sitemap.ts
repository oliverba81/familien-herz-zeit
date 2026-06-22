import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/meta";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const urls: MetadataRoute.Sitemap = [];

  // Home
  urls.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  });

  // Published Pages
  const pages = await db.page.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  for (const page of pages) {
    urls.push({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Kurse Overview
  urls.push({
    url: `${baseUrl}/kurse`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  });

  urls.push({
    url: `${baseUrl}/kurse/kalender`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  });

  // Published Courses
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  for (const course of courses) {
    urls.push({
      url: `${baseUrl}/kurse/${course.id}`,
      lastModified: course.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Videokurse Overview
  urls.push({
    url: `${baseUrl}/videokurse`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  });

  // Published VideoCourses
  const videoCourses = await db.videoCourse.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  for (const videoCourse of videoCourses) {
    urls.push({
      url: `${baseUrl}/videokurse/${videoCourse.id}`,
      lastModified: videoCourse.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Zeichen Overview
  urls.push({
    url: `${baseUrl}/zeichen`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  });

  // Published Signs
  const signs = await db.sign.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  for (const sign of signs) {
    urls.push({
      url: `${baseUrl}/zeichen/${sign.slug}`,
      lastModified: sign.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Legal Pages (falls vorhanden)
  const legalPages = [
    "impressum",
    "datenschutzerklaerung",
    "agb",
    "widerrufsbelehrung",
    "widerruf",
  ];
  for (const legalSlug of legalPages) {
    const exists = pages.some((p) => p.slug === legalSlug);
    if (!exists) {
      urls.push({
        url: `${baseUrl}/${legalSlug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return urls;
}



