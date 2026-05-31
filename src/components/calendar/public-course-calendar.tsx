"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarEvent } from "@/lib/calendar/course-events";
import deLocale from "@fullcalendar/core/locales/de";

interface PublicCourseCalendarProps {
  initialEvents: CalendarEvent[];
}

export default function PublicCourseCalendar({
  initialEvents,
}: PublicCourseCalendarProps) {
  const router = useRouter();
  const [events] = useState<CalendarEvent[]>(initialEvents);

  const handleEventClick = (info: any) => {
    // Verhindere Standard-Navigation
    info.jsEvent.preventDefault();

    // Navigiere zur Kurs-Detailseite
    // Verwende courseId aus extendedProps, da event.id jetzt courseId-sessionId Format hat
    const courseId = info.event.extendedProps?.courseId;
    if (courseId) {
      router.push(`/kurse/${courseId}`);
    }
  };

  return (
    <div className="w-full">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        locale={deLocale}
        timeZone="local"
        events={events}
        eventClick={handleEventClick}
        selectable={false}
        nowIndicator={true}
        editable={false}
        droppable={false}
        height="auto"
        eventDisplay="block"
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        weekends={true}
        eventClassNames="cursor-pointer hover:opacity-80"
        dayHeaderFormat={{ weekday: "short", day: "numeric", month: "short" }}
      />
    </div>
  );
}

