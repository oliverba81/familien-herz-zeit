import { db } from "@/lib/db";
import MainNavigationClient from "./main-navigation-client";
import HeaderHtmlRenderer from "./header-html-renderer";

interface NavigationItem {
  id: string;
  location: "HEADER" | "FOOTER";
  label: string;
  href: string | null;
  order: number;
  parentId: string | null;
  children: NavigationItem[];
}

export default async function NavigationLoader() {
  // Lade Settings
  const settings = await db.siteSettings.findMany();
  const settingsObj: Record<string, string | null> = {};
  settings.forEach((setting) => {
    settingsObj[setting.key] = setting.value;
  });

  // Wenn header_html gesetzt ist, verwende HTML-Renderer
  if (settingsObj.header_html) {
    return <HeaderHtmlRenderer html={settingsObj.header_html} />;
  }

  // Ansonsten verwende Standard-Komponente
  const headerItems = await db.navigationItem.findMany({
    where: {
      location: "HEADER",
      parentId: null,
    },
    include: {
      children: {
        orderBy: { order: "asc" },
        include: {
          children: {
            orderBy: { order: "asc" },
            include: {
              children: {
                orderBy: { order: "asc" },
                include: {
                  children: {
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return <MainNavigationClient items={headerItems as NavigationItem[]} />;
}

