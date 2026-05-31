import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import UploadForm from "@/components/media/upload-form";
import MediaGridClient from "@/components/media/media-grid-client";
import AdminContainer from "@/components/admin/admin-container";

export default async function MediaPage() {
  await requireRole(["ADMIN", "EDITOR"]);

  const media = await db.media.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AdminContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medien</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre hochgeladenen Bilder und Videos
          </p>
        </div>

        <UploadForm />

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Medienbibliothek
          </h2>
          <MediaGridClient media={media as any} />
        </div>
      </div>
    </AdminContainer>
  );
}

