import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import SignsAdmin from "@/components/signs/admin/signs-admin";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SignsPage() {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Babyzeichen-Lexikon</h1>
          <Link
            href="/zeichen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg transition-colors duration-200"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Frontend anzeigen</span>
          </Link>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Frontend-URL:</p>
              <p className="text-sm text-blue-700 font-mono">
                <Link
                  href="/zeichen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  /zeichen
                </Link>
              </p>
            </div>
            <Link
              href="/zeichen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <SignsAdmin />
      </div>
    </AdminContainer>
  );
}


