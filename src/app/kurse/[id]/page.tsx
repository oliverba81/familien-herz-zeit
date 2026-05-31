import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatBerlinDateTime, formatBerlinDate, formatBerlinTime } from "@/lib/utils/datetime";
import { formatCents } from "@/lib/utils/money";
import { Metadata } from "next";
import BookingForm from "@/components/courses/booking-form";
import { cachedCourseById } from "@/lib/cache/prisma-cache";
import { absoluteUrl, buildOpenGraph } from "@/lib/seo/meta";

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await cachedCourseById(id);

  if (!course || course.status !== "PUBLISHED") {
    return {
      title: "Kurs nicht gefunden | Familien Herz Zeit",
    };
  }

  const title = `${course.title} | Familien Herz Zeit`;
  const description = course.description
    ? course.description.substring(0, 160)
    : `Kurs: ${course.title}`;

  const url = absoluteUrl(`/kurse/${id}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    ...buildOpenGraph({
      title: course.title,
      description,
      url,
    }),
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { id } = await params;
  const now = new Date();

  const course = await cachedCourseById(id);

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  // Alle Sessions (auch vergangene) für die Anzeige
  const allSessions = course.sessions || [];
  const hasPlannedDate = course.plannedMonth && course.plannedYear;
  
  // Kurs muss entweder Sessions oder geplantes Datum haben
  if (allSessions.length === 0 && !hasPlannedDate) {
    notFound();
  }

  // Zukünftige Sessions für Buchbarkeit prüfen
  const futureSessions = allSessions.filter((s) => new Date(s.startAt) >= now);

  const bookingCount = course._count.bookings;
  const availableSpots = course.maxParticipants - bookingCount;
  const isFull = availableSpots <= 0;
  
  // Erster Termin (auch wenn vergangen) für die Anzeige, oder geplantes Datum
  const firstSession = allSessions.length > 0 ? allSessions[0] : null;
  
  // Formatiere geplantes Datum
  const formatPlannedDate = (month: number | null, year: number | null): string | null => {
    if (!month || !year) return null;
    const monthNames = [
      "Januar", "Februar", "März", "April", "Mai", "Juni",
      "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];
    return `ab ${monthNames[month - 1]} ${year}`;
  };
  
  const plannedDateDisplay = formatPlannedDate(course.plannedMonth, course.plannedYear);

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="mb-6">
              <div className="text-sm font-semibold text-rose-500 mb-2">
                {firstSession 
                  ? `${formatBerlinDate(firstSession.startAt)} um ${formatBerlinTime(firstSession.startAt)}`
                  : plannedDateDisplay || "Termin wird noch bekannt gegeben"
                }
                {firstSession && allSessions.length > 1 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({allSessions.length} Termine)
                  </span>
                )}
              </div>
              {allSessions.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Alle Termine:</div>
                  <div className="space-y-1">
                    {allSessions.map((session, idx) => {
                      const isPast = new Date(session.startAt) < now;
                      return (
                        <div key={session.id} className={`text-sm ${isPast ? "text-gray-400 line-through" : "text-gray-500"}`}>
                        {idx + 1}. {formatBerlinDate(session.startAt)} um {formatBerlinTime(session.startAt)}
                        {session.durationMinutes && (
                          <span className="ml-2">({session.durationMinutes} Min)</span>
                        )}
                          {isPast && <span className="ml-2 text-xs">(Vergangen)</span>}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {allSessions.length === 0 && hasPlannedDate && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Geplantes Startdatum:</div>
                  <div className="text-sm text-gray-500">
                    {plannedDateDisplay}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Die genauen Termine werden noch bekannt gegeben.
                  </p>
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {course.title}
              </h1>
              {course.series && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                    <span>🌿</span>
                    <span>Teil einer Terminserie</span>
                  </span>
                </div>
              )}
            </div>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {firstSession && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Dauer pro Termin</div>
                <div className="text-lg font-semibold text-gray-900">
                  {firstSession.durationMinutes || 60} Minuten
                </div>
              </div>
              )}
              <div>
                <div className="text-sm text-gray-500 mb-1">Preis</div>
                <div className="text-lg font-semibold text-rose-500">
                  {formatCents(course.priceCents)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Verfügbare Plätze</div>
                <div className={`text-lg font-semibold ${isFull ? "text-red-600" : "text-gray-900"}`}>
                  {isFull ? "Ausgebucht" : `${availableSpots} von ${course.maxParticipants}`}
                </div>
              </div>
              {course.location && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Ort</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {course.location}
                  </div>
                </div>
              )}
            </div>

            {futureSessions.length > 0 && !isFull && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Jetzt buchen
                </h2>
                <BookingForm courseId={course.id} />
              </div>
            )}

            {futureSessions.length === 0 && !hasPlannedDate && (
              <div className="border-t border-gray-200 pt-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-semibold">
                    Dieser Kurs hat keine zukünftigen Termine mehr.
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Bitte wählen Sie einen anderen Kurs oder kontaktieren Sie uns für weitere Informationen.
                  </p>
                </div>
              </div>
            )}
            
            {futureSessions.length === 0 && hasPlannedDate && (
              <div className="border-t border-gray-200 pt-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-semibold">
                    Termine werden noch bekannt gegeben
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    Die genauen Termine für diesen Kurs werden noch festgelegt. Bitte kontaktieren Sie uns für weitere Informationen oder um sich auf die Warteliste setzen zu lassen.
                  </p>
                </div>
              </div>
            )}

            {futureSessions.length > 0 && isFull && (
              <div className="border-t border-gray-200 pt-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-semibold">
                    Dieser Kurs ist leider ausgebucht.
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    Bitte wählen Sie einen anderen Kurs oder kontaktieren Sie uns für weitere Informationen.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

