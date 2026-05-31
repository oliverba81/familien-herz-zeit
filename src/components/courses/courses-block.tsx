import { db } from "@/lib/db";
import { formatBerlinDate, formatBerlinTime } from "@/lib/utils/datetime";
import { CoursesBlockData } from "@/lib/page-builder/types";

export default async function CoursesBlock({ data }: { data: CoursesBlockData }) {
  const now = new Date();
  const maxCourses = data.maxCourses || 3;
  const maxTopics = data.maxTopics || 3;

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

  // Trenne in mehrwöchige Kurse und Themenstunden basierend auf category
  // Berücksichtige auch Kurse mit geplantem Monat/Jahr
  const multiWeekCourses = sortedCourses
    .filter((course) => {
      // Wenn category explizit gesetzt ist, verwende das
      if (course.category === "COURSE") return true;
      if (course.category === "TOPIC") return false;
      // AUTO: Basierend auf Session-Anzahl (wenn Sessions vorhanden)
      if (course.sessions && course.sessions.length > 0) {
        return course.sessions.length > 1;
      }
      // Wenn nur geplantes Datum vorhanden, standardmäßig als mehrwöchiger Kurs behandeln
      return course.plannedMonth && course.plannedYear;
    })
    .slice(0, maxCourses);
  
  const singleSessionCourses = sortedCourses
    .filter((course) => {
      // Wenn category explizit gesetzt ist, verwende das
      if (course.category === "TOPIC") return true;
      if (course.category === "COURSE") return false;
      // AUTO: Basierend auf Session-Anzahl (wenn Sessions vorhanden)
      if (course.sessions && course.sessions.length > 0) {
        return course.sessions.length === 1;
      }
      // Kurse mit nur geplantem Datum werden nicht als Themenstunden behandelt
      return false;
    })
    .slice(0, maxTopics);

  // Debug: Log für Entwicklung (kann später entfernt werden)
  if (process.env.NODE_ENV === "development") {
    console.log("Courses Block Debug:", {
      totalCourses: courses.length,
      coursesWithSessions: coursesWithSessions.length,
      multiWeekCourses: multiWeekCourses.length,
      singleSessionCourses: singleSessionCourses.length,
      maxCourses,
      maxTopics,
      courseDetails: coursesWithSessions.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        sessionCount: c.sessions.length,
      })),
    });
  }

  // Formatierungs-Hilfsfunktionen
  const formatTimeRange = (start: Date, durationMinutes: number) => {
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return `${formatBerlinTime(start)} – ${formatBerlinTime(end)}`;
  };

  const getTimeSlots = (sessions: typeof courses[0]["sessions"]) => {
    const slots = new Set<string>();
    sessions.forEach((s) => {
      const date = new Date(s.startAt);
      const day = date.toLocaleDateString("de-DE", { weekday: "short" });
      const time = formatBerlinTime(s.startAt);
      slots.add(`${day} ${time}`);
    });
    return Array.from(slots).join(" & ");
  };

  return (
    <>
      <style>{`
        .fhz-kt-light{
          --brand:#c0363b;
          --text:#111827;
          --muted:#6b7280;
          --radius: 34px;
          --shadow: 0 22px 60px rgba(0,0,0,.14);
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
          color: var(--text);
        }
        .fhz-kt-light *{ box-sizing:border-box; }
        .fhz-kt-light .wrap{
          width: min(1120px, calc(100% - 28px));
          margin: 0 auto;
          padding: 44px 0 70px;
        }
        .fhz-kt-light .page-title{
          text-align:center;
          margin: 0 0 18px; 
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 950;
          letter-spacing: .4px;
          text-transform: uppercase;
        }
        .fhz-kt-light .page-title .accent{ color: var(--brand); }
        .fhz-kt-light .stage{
          position:relative;
          border-radius: var(--radius);
          overflow:hidden;
          box-shadow: var(--shadow);
          border: 1px solid rgba(0,0,0,.06);
          min-height: 680px;
          isolation:isolate;
          background:#fff;
        }
        .fhz-kt-light .stage.has-background{
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border: none;
        }
        .fhz-kt-light .stage.has-background .stage-overlay{
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
          pointer-events: none;
          border-radius: var(--radius);
        }
        .fhz-kt-light .content{
          position:relative;
          z-index:2;
          padding: 26px;
          display:flex;
          flex-direction:column;
          gap: 18px;
          min-height: 680px;
        }
        .fhz-kt-light .hero-panel{
          max-width: 860px;
          margin-top: 8px;
          padding: 18px 18px;
          border-radius: 26px;
          background: rgba(255,255,255,.55);
          border: 1px solid rgba(255,255,255,.60);
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          box-shadow: 0 18px 40px rgba(0,0,0,.10);
        }
        .fhz-kt-light .hero-panel h2{
          margin:0 0 8px;
          font-size: clamp(20px, 2.2vw, 34px);
          font-weight: 950;
          letter-spacing: .2px;
          color:#111827;
        }
        .fhz-kt-light .hero-panel p{
          margin:0;
          color: rgba(17,24,39,.78);
          font-size: 14px;
          line-height: 1.6;
        }
        .fhz-kt-light .grid{
          display:grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items:start;
        }
        .fhz-kt-light .panel{
          border-radius: 24px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.65);
          background: rgba(255,255,255,.52);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          box-shadow: 0 18px 44px rgba(0,0,0,.12);
          display:flex;
          flex-direction:column;
        }
        .fhz-kt-light .panel-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          padding: 14px 14px;
          background: rgba(255,255,255,.55);
          border-bottom: 1px solid rgba(17,24,39,.08);
        }
        .fhz-kt-light .head-left{
          display:flex;
          align-items:center;
          gap: 10px;
          min-width:0;
        }
        .fhz-kt-light .icon{
          width: 42px; height: 42px;
          border-radius: 16px;
          display:grid;
          place-items:center;
          flex:0 0 auto;
          box-shadow: 0 14px 28px rgba(0,0,0,.10);
          color:#fff;
        }
        .fhz-kt-light .panel.courses .icon{ background: var(--brand); }
        .fhz-kt-light .panel.topics  .icon{ background: #111827; }
        .fhz-kt-light .icon svg{ width: 20px; height: 20px; }
        .fhz-kt-light .panel-title{
          font-size: 12.5px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .25px;
          color: rgba(17,24,39,.92);
          white-space:nowrap;
          overflow:hidden;
          text-overflow: ellipsis;
        }
        .fhz-kt-light .pill{
          display:inline-flex;
          align-items:center;
          padding: 7px 10px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .2px;
          color: rgba(17,24,39,.70);
          background: rgba(255,255,255,.70);
          border: 1px solid rgba(17,24,39,.12);
          white-space:nowrap;
        }
        .fhz-kt-light .panel-body{
          padding: 14px;
          display:grid;
          gap: 12px;
        }
        .fhz-kt-light .event{
          border-radius: 18px;
          background: rgba(255,255,255,.86);
          border: 1px solid rgba(17,24,39,.08);
          box-shadow: 0 12px 26px rgba(0,0,0,.08);
          padding: 12px;
          display:grid;
          gap: 8px;
        }
        .fhz-kt-light .meta{
          display:flex;
          flex-wrap:wrap;
          gap: 8px;
          align-items:center;
          color: rgba(17,24,39,.55);
          font-weight: 900;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: .1px;
        }
        .fhz-kt-light .chip{
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.92);
          border: 1px solid rgba(17,24,39,.10);
        }
        .fhz-kt-light .chip svg{ width: 14px; height: 14px; color: rgba(17,24,39,.50); }
        .fhz-kt-light .event h4{
          margin: 0;
          font-size: 14px;
          font-weight: 950;
          color:#111827;
          letter-spacing: .1px;
        }
        .fhz-kt-light .event-foot{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          margin-top: 2px;
        }
        .fhz-kt-light .details{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          color: var(--brand);
          text-decoration:none;
          font-weight: 950;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .22px;
        }
        .fhz-kt-light .details:hover{ text-decoration: underline; }
        .fhz-kt-light .details svg{ width: 16px; height: 16px; }
        .fhz-kt-light .tag{
          font-size: 10px;
          font-weight: 950;
          color: rgba(17,24,39,.42);
          text-transform: uppercase; 
          letter-spacing: .18px;
        }
        .fhz-kt-light .note{
          margin-top: 6px;
          border-radius: 18px;
          padding: 12px 12px;
          background: rgba(255,255,255,.60);
          border: 1px solid rgba(17,24,39,.10);
          color: rgba(17,24,39,.72);
          font-size: 12px;
          line-height: 1.5;
          display:flex;
          gap: 10px;
          align-items:flex-start;
        }
        .fhz-kt-light .note svg{ width: 18px; height: 18px; color: rgba(17,24,39,.55); margin-top: 1px; }
        .fhz-kt-light .note b{ color:#111827; }
        .fhz-kt-light .cta{
          margin-top: auto;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.70);
          background: rgba(255,255,255,.70);
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          box-shadow: 0 18px 40px rgba(0,0,0,.10);
          padding: 14px;
          display:flex;
          flex-direction:column;
          gap: 12px;
          color:#111827;
        }
        .fhz-kt-light .cta-left{
          display:flex;
          gap: 12px;
          align-items:flex-start;
        }
        .fhz-kt-light .cta-ico{
          width: 46px; height: 46px;
          border-radius: 999px;
          background: rgba(230,59,102,.14);
          border: 1px solid rgba(230,59,102,.25);
          display:grid;
          place-items:center;
          flex:0 0 auto;
          color: var(--brand);
        }
        .fhz-kt-light .cta-ico svg{ width: 22px; height: 22px; }
        .fhz-kt-light .cta h5{
          margin: 0;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .2px;
          font-size: 13px;
        }
        .fhz-kt-light .cta p{
          margin: 4px 0 0;
          color: rgba(17,24,39,.68);
          font-size: 13px;
          line-height: 1.55;
        }
        .fhz-kt-light .btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding: 12px 16px;
          border-radius: 999px;
          background: var(--brand);
          color:#fff;
          text-decoration:none;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .2px;
          font-size: 12px;
          width: 100%;
          box-shadow: 0 18px 38px rgba(230,59,102,.20);
        }
        @media (min-width: 880px){
          .fhz-kt-light .grid{ grid-template-columns: 1fr 1fr; gap: 18px; }
          .fhz-kt-light .content{ padding: 32px; }
          .fhz-kt-light .cta{
            flex-direction:row;
            align-items:center;
            justify-content:space-between;
          }
          .fhz-kt-light .btn{ width:auto; padding-inline: 18px; }
        }
        @media (max-width: 520px){
          .fhz-kt-light .content{ padding: 16px; min-height: auto; }
          .fhz-kt-light .stage{ min-height: auto; border-radius: 26px; }
        }
      `}</style>

      <section className="fhz-kt-light" aria-label="Kurse & Termine">
        <div className="wrap">
          <h2 className="page-title">Kurse & <span className="accent">Termine</span></h2>

          <div 
            className={`stage ${data.backgroundImage?.url ? 'has-background' : ''}`}
            style={data.backgroundImage?.url ? {
              backgroundImage: `url(${data.backgroundImage.url})`,
            } : undefined}
          >
            {data.backgroundImage?.url && (
              <div 
                className="stage-overlay"
                style={{
                  backgroundColor: `rgba(255, 255, 255, ${(data.backgroundImageOpacity ?? 75) / 100})`,
                }}
              />
            )}
            <div className="content">
              <div className="hero-panel">
                {data.title && <h2>{data.title}</h2>}
                {data.subtitle && (
                  <p>{data.subtitle}</p>
                )}
              </div>

              <div className="grid">
                {/* Babyzeichenkurse */}
                <section className="panel courses" aria-label="Babyzeichenkurse">
                  <header className="panel-head">
                    <div className="head-left">
                      <div className="icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff">
                          <path d="M17.19 21a5 5 0 0 1-4.51-2.85 1 1 0 0 1 .48-1.34 1 1 0 0 1 1.33.48 3 3 0 1 0 3.87-4.08A3.05 3.05 0 0 0 17 13a1 1 0 1 1-.15-2 5 5 0 0 1 1.66 9.81A5.27 5.27 0 0 1 17.19 21z"/>
                          <path d="M6.81 21a4.84 4.84 0 0 1-1.3-.17A5 5 0 0 1 7.17 11 1 1 0 1 1 7 13a3.05 3.05 0 0 0-1.72.39 3 3 0 1 0 4.21 3.89 1 1 0 0 1 1.33-.48 1 1 0 0 1 .48 1.34A5 5 0 0 1 6.81 21z"/>
                          <path d="M12 18.9A5.9 5.9 0 1 1 17.9 13 5.91 5.91 0 0 1 12 18.9zm0-9.8A3.9 3.9 0 1 0 15.9 13 3.91 3.91 0 0 0 12 9.1z"/>
                          <path d="M15.29 10.26a1 1 0 0 1-.56-.17 1 1 0 0 1-.26-1.39A3 3 0 0 0 15 7a3 3 0 0 0-6 0 3 3 0 0 0 .53 1.7 1 1 0 1 1-1.65 1.13 5 5 0 1 1 8.24 0 1 1 0 0 1-.83.43z"/>
                        </svg>
                      </div>
                      <div className="panel-title">Babyzeichenkurse</div>
                    </div>
                    <span className="pill">Mehrwöchig</span>
                  </header>

                  <div className="panel-body">
                    {multiWeekCourses.length > 0 ? (
                      multiWeekCourses.map((course) => {
                        // Prüfe ob Sessions vorhanden oder geplantes Datum
                        const hasSessions = course.sessions && course.sessions.length > 0;
                        const hasPlannedDate = course.plannedMonth && course.plannedYear;
                        
                        if (!hasSessions && !hasPlannedDate) return null;
                        
                        const bookingCount = course._count.bookings;
                        const isFull = bookingCount >= course.maxParticipants;
                        
                        // Datum-Anzeige: Entweder genaues Datum oder geplantes Datum
                        let dateDisplay: string;
                        let timeDisplay: string | null = null;
                        
                        if (hasSessions && course.sessions[0]?.startAt) {
                          const firstSession = course.sessions[0];
                          dateDisplay = formatBerlinDate(firstSession.startAt);
                          timeDisplay = getTimeSlots(course.sessions);
                        } else if (hasPlannedDate) {
                          const monthNames = [
                            "Januar", "Februar", "März", "April", "Mai", "Juni",
                            "Juli", "August", "September", "Oktober", "November", "Dezember"
                          ];
                          dateDisplay = `ab ${monthNames[course.plannedMonth! - 1]} ${course.plannedYear}`;
                        } else {
                          return null;
                        }

                        return (
                          <article key={course.id} className="event">
                            <div className="meta">
                              <span className="chip">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                  <path d="M3 10H21M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
                                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {dateDisplay}
                              </span>
                              {timeDisplay && (
                                <span className="chip">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 8a1 1 0 0 1 1 1v3.6l2.4 1.4a1 1 0 1 1-1 1.7l-2.9-1.7A1 1 0 0 1 11 14V9a1 1 0 0 1 1-1z"/>
                                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                                  </svg>
                                  {timeDisplay}
                                </span>
                              )}
                            </div>
                            <h4>{course.title}</h4>
                            <div className="event-foot">
                              <a className="details" href={`/kurse/${course.id}`}>
                                Details
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="#e63b66">
                                  <path d="M18 24H2a2 2 0 1 0 0 4h16a2 2 0 1 0 0-4zm8-8H2a2 2 0 1 0 0 4h24a2 2 0 1 0 0-4zM2 12h16a2 2 0 1 0 0-4H2a2 2 0 1 0 0 4zm0-12h24a2 2 0 1 0 0-4H2a2 2 0 1 0 0 4z"/>
                                </svg>
                              </a>
                              <span className="tag">{isFull ? "Ausgebucht" : "Anfängerkurs"}</span>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      data.showEmptyMessage && (
                        <p className="text-gray-500 text-sm">Derzeit sind keine Kurse verfügbar.</p>
                      )
                    )}

                    <div className="note">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      <div><b>Tipp:</b> Unsere Kurse bieten eine feste Gruppe und kontinuierliches Lernen über mehrere Wochen.</div>
                    </div>
                  </div>
                </section>

                {/* Themenstunden */}
                <section className="panel topics" aria-label="Themenstunden">
                  <header className="panel-head">
                    <div className="head-left">
                      <div className="icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 22H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1H20a1 1 0 0 1 1 1V18a1 1 0 0 1-2 0V4H6V20H20a1 1 0 0 1 0 2z"/>
                          <path d="M7 7H3a1 1 0 0 1 0-2H7a1 1 0 0 1 0 2z"/>
                          <path d="M7 11H3a1 1 0 0 1 0-2H7a1 1 0 0 1 0 2z"/>
                          <path d="M7 15H3a1 1 0 0 1 0-2H7a1 1 0 0 1 0 2z"/>
                          <path d="M7 19H3a1 1 0 0 1 0-2H7a1 1 0 0 1 0 2z"/>
                          <path d="M15 11H11a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z"/>
                          <path d="M15 15H11a1 1 0 0 1 0-2h4a1 1 0 0 1 0 2z"/>
                        </svg>
                      </div>
                      <div className="panel-title">Themenstunden</div>
                    </div>
                    <span className="pill">Einzeltermine</span>
                  </header>

                  <div className="panel-body">
                    {singleSessionCourses.length > 0 ? (
                      singleSessionCourses.map((course) => {
                        // Prüfe ob Sessions vorhanden oder geplantes Datum
                        const hasSessions = course.sessions && course.sessions.length > 0;
                        const hasPlannedDate = course.plannedMonth && course.plannedYear;
                        
                        if (!hasSessions && !hasPlannedDate) return null;
                        
                        const bookingCount = course._count.bookings;
                        const isFull = bookingCount >= course.maxParticipants;
                        
                        // Datum-Anzeige: Entweder genaues Datum oder geplantes Datum
                        let dateDisplay: string;
                        let timeDisplay: string | null = null;
                        
                        if (hasSessions && course.sessions[0]?.startAt) {
                          const session = course.sessions[0];
                          dateDisplay = formatBerlinDate(session.startAt);
                          timeDisplay = formatTimeRange(session.startAt, session.durationMinutes || 60);
                        } else if (hasPlannedDate) {
                          const monthNames = [
                            "Januar", "Februar", "März", "April", "Mai", "Juni",
                            "Juli", "August", "September", "Oktober", "November", "Dezember"
                          ];
                          dateDisplay = `ab ${monthNames[course.plannedMonth! - 1]} ${course.plannedYear}`;
                        } else {
                          return null;
                        }

                        return (
                          <article key={course.id} className="event">
                            <div className="meta">
                              <span className="chip">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                  <path d="M3 10H21M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
                                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {dateDisplay}
                              </span>
                              {timeDisplay && (
                                <span className="chip">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 8a1 1 0 0 1 1 1v3.6l2.4 1.4a1 1 0 1 1-1 1.7l-2.9-1.7A1 1 0 0 1 11 14V9a1 1 0 0 1 1-1z"/>
                                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                                  </svg>
                                  {timeDisplay}
                                </span>
                              )}
                            </div>
                            <h4>{course.title}</h4>
                            <div className="event-foot">
                              <a className="details" href={`/kurse/${course.id}`}>
                                Details
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="#e63b66">
                                  <path d="M18 24H2a2 2 0 1 0 0 4h16a2 2 0 1 0 0-4zm8-8H2a2 2 0 1 0 0 4h24a2 2 0 1 0 0-4zM2 12h16a2 2 0 1 0 0-4H2a2 2 0 1 0 0 4zm0-12h24a2 2 0 1 0 0-4H2a2 2 0 1 0 0 4z"/>
                                </svg>
                              </a>
                              <span className="tag">{isFull ? "Ausgebucht" : "Spezial"}</span>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      data.showEmptyMessage && (
                        <p className="text-gray-500 text-sm">Derzeit sind keine Themenstunden verfügbar.</p>
                      )
                    )}

                    <div className="note">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      <div>Themenstunden sind perfekt für einen schnellen Einblick oder zur Vertiefung spezifischer Bereiche.</div>
                    </div>
                  </div>
                </section>
              </div>

              {/* CTA */}
              <div className="cta" role="region" aria-label="Kontakt CTA">
                <div className="cta-left">
                  <div className="cta-ico" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 5.2c1.1 0 2 .89 2 2 0 .37-.11.71-.28 1C8.72 8.2 8 8 7 8s-1.72.2-1.72.2c-.17-.29-.28-.63-.28-1 0-1.11.9-2 2-2zm6 0c1.11 0 2 .89 2 2 0 .37-.11.71-.28 1 0 0-.72-.2-1.72-.2s-1.72.2-1.72.2c-.17-.29-.28-.63-.28-1 0-1.11.89-2 2-2zm-3 13.7c3.72 0 7.03-2.36 8.23-5.88l-1.32-.46C15.9 15.52 13.12 17.5 10 17.5s-5.9-1.98-6.91-4.94l-1.32.46c1.2 3.52 4.51 5.88 8.23 5.88z"/>
                    </svg>
                  </div>
                  <div>
                    <h5>Nicht das passende dabei?</h5>
                    <p>Keine Sorge! Melde dich einfach bei uns. Wir finden gemeinsam den richtigen Termin oder setzen dich auf die Warteliste.</p>
                  </div>
                </div>
                <a className="btn" href={data.contactLinkUrl || "#kontakt"}>
                  {data.contactLinkLabel || "Jetzt Kontakt aufnehmen"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

