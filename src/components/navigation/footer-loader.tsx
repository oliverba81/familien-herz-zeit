import { db } from "@/lib/db";
import FooterClient from "./footer-client";
import FooterHtmlRenderer from "./footer-html-renderer";

interface NavigationItem {
  id: string;
  location: "HEADER" | "FOOTER";
  label: string;
  href: string | null;
  order: number;
  parentId: string | null;
  children: NavigationItem[];
}

export default async function FooterLoader() {
  // Lade Settings
  const settings = await db.siteSettings.findMany();
  const settingsObj: Record<string, string | null> = {};
  settings.forEach((setting) => {
    settingsObj[setting.key] = setting.value;
  });

  // Wenn footer_html gesetzt ist, verwende HTML-Renderer
  if (settingsObj.footer_html) {
    return <FooterHtmlRenderer html={settingsObj.footer_html} />;
  }

  // Ansonsten verwende Standard-Komponente
  const footerItems = await db.navigationItem.findMany({
    where: {
      location: "FOOTER",
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

  return <FooterClient items={footerItems as NavigationItem[]} />;
}

