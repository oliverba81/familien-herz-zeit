"use client";

import { useState } from "react";
import WaitlistFilters from "./waitlist-filters";
import WaitlistTable from "./waitlist-table";

interface Course {
  id: string;
  title: string;
}

interface WaitlistPageClientProps {
  courses: Course[];
  initialFilters?: {
    courseId?: string;
    q?: string;
  };
}

export default function WaitlistPageClient({
  courses,
  initialFilters,
}: WaitlistPageClientProps) {
  const [filters, setFilters] = useState<{
    courseId?: string;
    q?: string;
  }>(initialFilters || {});

  return (
    <>
      <WaitlistFilters
        courses={courses}
        initialFilters={initialFilters}
        onFilterChange={setFilters}
      />
      <WaitlistTable filters={filters} />
    </>
  );
}

