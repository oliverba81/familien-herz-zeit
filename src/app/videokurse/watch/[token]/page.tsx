import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface WatchPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { token } = await params;
  
  const accessToken = await db.videoAccessToken.findUnique({
    where: { token },
    include: { videoCourse: true },
  });

  if (!accessToken || !isTokenValid(accessToken)) {
    return {
      title: "Zugang nicht verfügbar",
    };
  }

  return {
    title: accessToken.videoCourse.title,
    description: "Videokurs ansehen",
  };
}

function isTokenValid(token: {
  revokedAt: Date | null;
  expiresAt: Date;
  videoCourse: { status: string };
}): boolean {
  const now = new Date();
  return (
    !token.revokedAt &&
    token.expiresAt > now &&
    token.videoCourse.status === "PUBLISHED"
  );
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { token } = await params;

  const accessToken = await db.videoAccessToken.findUnique({
    where: { token },
    include: { videoCourse: true },
  });

  if (!accessToken) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Zugang nicht gefunden
            </h1>
            <p className="text-gray-600">
              Der Zugangslink ist ungültig oder wurde nicht gefunden.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const isValid = isTokenValid(accessToken);

  if (!isValid) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Zugang abgelaufen oder widerrufen
            </h1>
            <p className="text-gray-600 mb-2">
              {accessToken.revokedAt
                ? "Dieser Zugang wurde widerrufen."
                : accessToken.expiresAt < now
                ? `Dieser Zugang ist am ${accessToken.expiresAt.toLocaleDateString("de-DE")} abgelaufen.`
                : "Dieser Videokurs ist nicht mehr verfügbar."}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Bitte fordere einen neuen Zugang an.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const course = accessToken.videoCourse;
  const expiresDate = new Date(accessToken.expiresAt);
  const expiresFormatted = expiresDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {course.thumbnailUrl && (
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {course.title}
            </h1>

            <div className="mb-6">
              <video
                src={`/api/video/stream?token=${token}`}
                controls
                preload="metadata"
                poster={course.thumbnailUrl || undefined}
                className="w-full rounded-lg shadow-md"
              >
                Dein Browser unterstützt das Video-Element nicht.
              </video>
            </div>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500 text-center">
                Zugang gültig bis: {expiresFormatted}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

