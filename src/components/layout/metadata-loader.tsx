import { db } from "@/lib/db";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.siteSettings.findMany();
  const settingsObj: Record<string, string | null> = {};
  settings.forEach((setting) => {
    settingsObj[setting.key] = setting.value;
  });

  const siteName = settingsObj.site_name || "Familien Herz Zeit";
  const faviconUrl = settingsObj.favicon_url;

  const metadata: Metadata = {
    title: siteName,
    description: `${siteName} - Ihre Familienwebsite`,
  };

  if (faviconUrl) {
    metadata.icons = {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    };
  }

  return metadata;
}

