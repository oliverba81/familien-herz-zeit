import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import SignForm from "@/components/signs/admin/sign-form";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSignPage({ params }: PageProps) {
  const session = await requireRole(["ADMIN", "EDITOR"]);

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const sign = await db.sign.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!sign) {
    notFound();
  }

  // Transformiere für Form
  const initialData = {
    ...sign,
    tags: sign.tags.map((st) => st.tag),
    tagNames: sign.tags.map((st) => st.tag.name),
  };

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Zeichen bearbeiten</h1>
          {sign.status === "PUBLISHED" && (
            <Link
              href={`/zeichen/${sign.slug}`}
              target="_blank"
              className="text-rose-500 hover:text-rose-600 font-semibold transition-colors"
            >
              Vorschau →
            </Link>
          )}
        </div>
        <SignForm mode="edit" initialData={initialData} />
      </div>
    </AdminContainer>
  );
}



