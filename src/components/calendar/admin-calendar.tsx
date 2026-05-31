"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarEvent } from "@/lib/calendar/course-events";
import deLocale from "@fullcalendar/core/locales/de";

interface AdminCalendarProps {
  initialEvents: CalendarEvent[];
}

export default function AdminCalendar({ initialEvents }: AdminCalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [events] = useState<CalendarEvent[]>(initialEvents);

  const handleEventClick = (info: any) => {
    // Verhindere Standard-Navigation
    info.jsEvent.preventDefault();

    // Navigiere zur Ansichtsseite des Kurses
    if (info.event.extendedProps?.courseId) {
      router.push(`/admin/courses/${info.event.extendedProps.courseId}/view`);
    }
  };

  const handleDateClick = (info: any) => {
    // Klick auf freien Slot: Öffne New Course Form mit vorausgefülltem Datum
    const clickedDate = info.date;
    const isoString = clickedDate.toISOString();
    router.push(`/admin/courses/new?startAt=${encodeURIComponent(isoString)}`);
  };

  const handleSelect = (info: any) => {
    // Bereich auswählen: Nutze Start-Datum
    const startDate = info.start;
    const isoString = startDate.toISOString();
    router.push(`/admin/courses/new?startAt=${encodeURIComponent(isoString)}`);
  };

  return (
    <>
      <div className="w-full">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale={deLocale}
          timeZone="local"
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          select={handleSelect}
          selectable={true}
          selectMirror={true}
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
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Mo-Fr
            startTime: "09:00",
            endTime: "18:00",
          }}
          eventClassNames="cursor-pointer"
          dayHeaderFormat={{ weekday: "short", day: "numeric", month: "short" }}
        />
      </div>
    </>
  );
}

