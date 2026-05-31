"use client";

import { useState } from "react";
import MediaGrid from "./media-grid";

interface Media {
  id: string;
  type: "IMAGE" | "VIDEO";
  title: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
}

interface MediaGridClientProps {
  media: Media[];
}

export default function MediaGridClient({ media }: MediaGridClientProps) {
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  return (
    <MediaGrid
      media={media}
      filter={filter}
      onFilterChange={setFilter}
    />
  );
}

