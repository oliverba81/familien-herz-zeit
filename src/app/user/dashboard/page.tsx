import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatCents } from "@/lib/utils/money";
import UserDashboardClient from "@/components/user/user-dashboard-client";

export default async function UserDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/user/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/user/login");
  }

  // Nur CUSTOMER dürfen auf User Dashboard
  if (user.role !== "CUSTOMER") {
    redirect("/admin");
  }

  // Lade Purchases mit Invoices
  const purchases = await db.videoPurchase.findMany({
    where: {
      userId: user.id,
      status: "PAID",
    },
    include: {
      videoCourse: {
        select: {
          title: true,
          slug: true,
          accessTokens: {
            where: {
              email: user.email,
              revokedAt: null,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              token: true,
              expiresAt: true,
            },
          },
        },
      },
      invoice: true,
    },
    orderBy: {
      paidAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Mein Konto
          </h1>
          <p className="text-gray-600 mt-2">
            Willkommen, {user.firstName || user.email}!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Meine Käufe
              </h2>
              {purchases.length === 0 ? (
                <p className="text-gray-500">Noch keine Käufe vorhanden.</p>
              ) : (
                <div className="space-y-4">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {purchase.videoCourse.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Gekauft am{" "}
                            {purchase.paidAt
                              ? new Date(purchase.paidAt).toLocaleDateString("de-DE")
                              : "-"}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            {formatCents(purchase.amountCents)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {purchase.invoice ? (
                            <Link
                              href={purchase.invoice.pdfUrl}
                              target="_blank"
                              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Rechnung herunterladen
                            </Link>
                          ) : (
                            <UserDashboardClient purchaseId={purchase.id} />
                          )}
                          {purchase.videoCourse.accessTokens.length > 0 && (
                            <Link
                              href={`/videokurse/watch/${purchase.videoCourse.accessTokens[0].token}`}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Ansehen
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Account
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">E-Mail:</span>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                {user.firstName && user.lastName && (
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                )}
                {(user.address || user.city) && (
                  <div>
                    <span className="text-gray-500">Adresse:</span>
                    <p className="text-gray-900">
                      {user.address && <>{user.address}<br /></>}
                      {user.zip} {user.city}
                      {user.country && <><br />{user.country}</>}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

