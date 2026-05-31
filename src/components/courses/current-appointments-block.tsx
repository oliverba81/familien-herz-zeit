import { db } from "@/lib/db";
import { formatBerlinDate, formatBerlinTime } from "@/lib/utils/datetime";
import { CurrentAppointmentsBlockData } from "@/lib/page-builder/types";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";

export default async function CurrentAppointmentsBlock({ data }: { data: CurrentAppointmentsBlockData }) {
  const now = new Date();
  const title = data.title || "Aktuelle Termine";
  const showCourses = data.showCourses !== false; // Standard: true
  const showTopics = data.showTopics !== false; // Standard: true
  const maxItems = data.maxItems || 10;
  const showEmptyMessage = data.showEmptyMessage !== false;
  const width = data.width || "full";
  const footerHtml = data.footerHtml;

  // Berechne Container-Breite
  const getWidthStyle = (): React.CSSProperties => {
    if (width === "full") {
      return { 
        maxWidth: "100%", 
        width: "100%",
        marginLeft: "auto",
        marginRight: "auto",
      };
    }
    if (width === "medium") {
      return { 
        maxWidth: "1200px", 
        width: "100%", 
        marginLeft: "auto",
        marginRight: "auto",
      };
    }
    if (width === "narrow") {
      return { 
        maxWidth: "800px", 
        width: "100%", 
        marginLeft: "auto",
        marginRight: "auto",
      };
    }
    // Benutzerdefiniert
    return { 
      maxWidth: width, 
      width: "100%", 
      marginLeft: "auto",
      marginRight: "auto",
    };
  };

  // Lade veröffentlichte Kurse mit allen Sessions (auch vergangene)
  const courses = await db.course.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      sessions: {
        orderBy: {
          startAt: "asc",
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: {
                in: ["PENDING", "CONFIRMED"],
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Filtere Kurse mit mindestens einer Session ODER geplantem Monat/Jahr
  const coursesWithSessions = courses.filter(
    (course) => 
      (course.sessions && course.sessions.length > 0) ||
      (course.plannedMonth && course.plannedYear)
  );

  // Sortiere Kurse chronologisch nach Datum und Uhrzeit der ersten Session oder geplantem Monat/Jahr
  const sortedCourses = [...coursesWithSessions].sort((a, b) => {
    const firstSessionA = a.sessions?.[0]?.startAt;
    const firstSessionB = b.sessions?.[0]?.startAt;
    
    // Wenn beide Sessions haben, sortiere nach Session-Datum
    if (firstSessionA && firstSessionB) {
      return new Date(firstSessionA).getTime() - new Date(firstSessionB).getTime();
    }
    
    // Wenn einer plannedMonth/Year hat, verwende das für Sortierung
    if (!firstSessionA && a.plannedMonth && a.plannedYear) {
      const dateA = new Date(a.plannedYear, a.plannedMonth - 1, 1);
      if (!firstSessionB && b.plannedMonth && b.plannedYear) {
        const dateB = new Date(b.plannedYear, b.plannedMonth - 1, 1);
        return dateA.getTime() - dateB.getTime();
      }
      return dateA.getTime() - (firstSessionB ? new Date(firstSessionB).getTime() : 0);
    }
    
    if (!firstSessionB && b.plannedMonth && b.plannedYear) {
      const dateB = new Date(b.plannedYear, b.plannedMonth - 1, 1);
      return (firstSessionA ? new Date(firstSessionA).getTime() : 0) - dateB.getTime();
    }
    
    // Fallback: Sessions haben Priorität
    if (!firstSessionA && !firstSessionB) return 0;
    if (!firstSessionA) return 1;
    if (!firstSessionB) return -1;
    
    return new Date(firstSessionA).getTime() - new Date(firstSessionB).getTime();
  });

  // Filtere nach ausgewählten Kursarten
  const filteredCourses = sortedCourses.filter((course) => {
    // Wenn category explizit gesetzt ist, verwende das
    if (course.category === "COURSE") return showCourses;
    if (course.category === "TOPIC") return showTopics;
    
    // AUTO: Basierend auf Session-Anzahl (wenn Sessions vorhanden)
    if (course.sessions && course.sessions.length > 0) {
      if (course.sessions.length > 1) {
        return showCourses; // Mehrwöchiger Kurs
      } else {
        return showTopics; // Themenstunde
      }
    }
    
    // Wenn nur geplantes Datum vorhanden, standardmäßig als mehrwöchiger Kurs behandeln
    if (course.plannedMonth && course.plannedYear) {
      return showCourses;
    }
    
    return false;
  });

  // Begrenze auf maxItems
  const displayCourses = filteredCourses.slice(0, maxItems);

  // Formatierungs-Hilfsfunktionen
  const formatTimeRange = (start: Date, durationMinutes: number) => {
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return `${formatBerlinTime(start)} – ${formatBerlinTime(end)}`;
  };

  const getCourseCategory = (course: typeof courses[0]) => {
    if (course.category === "COURSE") return "COURSE";
    if (course.category === "TOPIC") return "TOPIC";
    if (course.sessions && course.sessions.length > 0) {
      return course.sessions.length > 1 ? "COURSE" : "TOPIC";
    }
    return "COURSE"; // Default für geplante Kurse
  };

  const widthStyle = getWidthStyle();

  return (
    <div className="current-appointments-block-wrapper" style={widthStyle}>
      <div className="current-appointments-block">
      <style>{`
        .current-appointments-block-wrapper {
          box-sizing: border-box !important;
          display: block !important;
        }
        .current-appointments-block {
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
          box-sizing: border-box;
          width: 100%;
        }
        .current-appointments-block .block-title {
          font-size: 29px;
          font-weight: 700;
          color: #111827;
          margin-top: 48px;
          margin-bottom: 24px;
          text-align: center;
        }
        .current-appointments-block .appointments-list {
          display: grid;
          gap: 12px;
        }
        .current-appointments-block .appointment-item {
          padding: 16px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          box-shadow: 0 2px 8px rgba(0,0,0,.05);
          display: block;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .current-appointments-block .appointment-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,.1);
          transform: translateY(-2px);
        }
        .current-appointments-block .appointment-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .current-appointments-block .category-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .current-appointments-block .category-badge.course {
          background: #c0363b;
          color: #fff;
        }
        .current-appointments-block .category-badge.topic {
          background: #111827;
          color: #fff;
        }
        .current-appointments-block .appointment-title {
          font-size: 19px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .current-appointments-block .appointment-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 16px;
          color: #6b7280;
          margin-top: 8px;
        }
        .current-appointments-block .empty-message {
          padding: 24px;
          text-align: center;
          color: #6b7280;
          font-size: 17px;
        }
        .current-appointments-block .footer-html {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(0,0,0,.08);
        }
        .current-appointments-block .footer-html :global(.prose) {
          max-width: none;
        }
        .current-appointments-block .footer-html :global(a) {
          color: #c0363b;
          text-decoration: underline;
        }
        .current-appointments-block .footer-html :global(a:hover) {
          color: #a02d32;
        }
      `}</style>

      {title && (
        <h2 
          className="block-title"
          dangerouslySetInnerHTML={{ __html: cleanAndConvertHtml(title) }}
        />
      )}

      <div className="appointments-list">
        {displayCourses.length === 0 ? (
          showEmptyMessage && (
            <div className="empty-message">
              <p>Derzeit sind keine Termine verfügbar.</p>
            </div>
          )
        ) : (
          displayCourses.map((course) => {
            const category = getCourseCategory(course);
            const firstSession = course.sessions?.[0];
            const hasPlannedDate = course.plannedMonth && course.plannedYear;
            
            // Datum formatieren
            let dateDisplay = "";
            if (firstSession) {
              dateDisplay = formatBerlinDate(firstSession.startAt);
            } else if (hasPlannedDate) {
              const monthNames = [
                "Januar", "Februar", "März", "April", "Mai", "Juni",
                "Juli", "August", "September", "Oktober", "November", "Dezember"
              ];
              dateDisplay = `ab ${monthNames[course.plannedMonth! - 1]} ${course.plannedYear}`;
            }

            return (
              <a 
                key={course.id} 
                href={`/kurse/${course.id}`}
                className="appointment-item"
              >
                <div className="appointment-header">
                  <span className={`category-badge ${category.toLowerCase()}`}>
                    {category === "COURSE" ? "Babyzeichenkurs" : "Themenstunde"}
                  </span>
                </div>
                <h3 className="appointment-title">{course.title}</h3>
                <div className="appointment-meta">
                  {dateDisplay && <span>📅 {dateDisplay}</span>}
                  {firstSession && (
                    <span>🕐 {formatTimeRange(firstSession.startAt, firstSession.durationMinutes)}</span>
                  )}
                  {course.location && <span>📍 {course.location}</span>}
                </div>
              </a>
            );
          })
        )}
      </div>

      {footerHtml && (
        <div 
          className="footer-html prose max-w-none prose-a:text-rose-600 prose-a:hover:text-rose-700 prose-a:underline"
          dangerouslySetInnerHTML={{ __html: cleanAndConvertHtml(footerHtml) }}
        />
      )}
      </div>
    </div>
  );
}

