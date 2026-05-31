import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import Link from "next/link";
import Badge from "@/components/ui/badge";
import PageRowActions from "@/components/admin/page-row-actions";

export default async function PagesPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  const [pages, homepageSetting] = await Promise.all([
    db.page.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        published: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.siteSettings.findUnique({
      where: { key: "homepage_slug" },
      select: { value: true },
    }),
  ]);

  const homepageSlug = (homepageSetting?.value?.trim() as string) || "home";

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Seiten</h1>
          <div className="flex gap-2">
            {!pages.find((p) => p.slug === homepageSlug) && (
              <Link
                href={`/admin/pages/new?slug=${encodeURIComponent(homepageSlug)}&title=Startseite`}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
              >
                Startseite erstellen
              </Link>
            )}
            <Link
              href="/admin/pages/new"
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
            >
              Neue Seite
            </Link>
            <Link
              href="/admin/pages/import"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
            >
              Seiten importieren
            </Link>
          </div>
        </div>

        {pages.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 mb-4">Noch keine Seiten vorhanden.</p>
            <Link
              href="/admin/pages/new"
              className="inline-block bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Erste Seite erstellen
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktualisiert
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => {
                  const isStartPage = page.slug === homepageSlug;
                  return (
                  <tr
                    key={page.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/pages/${page.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-rose-600 transition-colors"
                        >
                          {page.title}
                        </Link>
                        {isStartPage && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Startseite
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {isStartPage ? (
                          <span className="font-semibold text-rose-600">/ (Startseite)</span>
                        ) : (
                          `/${page.slug}`
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {page.published ? (
                        <Badge variant="success">Veröffentlicht</Badge>
                      ) : (
                        <Badge variant="default">Entwurf</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(page.updatedAt).toLocaleDateString("de-DE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white hover:bg-gray-50">
                      <PageRowActions
                        pageId={page.id}
                        slug={page.slug}
                        isStartPage={isStartPage}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}

