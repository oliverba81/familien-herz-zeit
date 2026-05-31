"use client";

import { useEffect } from "react";
import { PageContentV1 } from "@/lib/page-builder/schema";
import PageRenderer from "@/components/page-renderer/page-renderer";

interface PreviewCanvasProps {
  content: PageContentV1;
  device: "desktop" | "tablet" | "mobile";
}

export default function PreviewCanvas({ content, device }: PreviewCanvasProps) {
  // Prevent navigation on link clicks in preview
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const container = document.getElementById("preview-canvas-container");
    if (container) {
      container.addEventListener("click", handleClick, true);
      return () => {
        container.removeEventListener("click", handleClick, true);
      };
    }
  }, []);

  const deviceConfig = {
    desktop: {
      width: "w-full",
      label: "Desktop",
    },
    tablet: {
      width: "w-[820px] max-w-full",
      label: "Tablet",
    },
    mobile: {
      width: "w-[390px] max-w-full",
      label: "Mobile",
    },
  };

  const config = deviceConfig[device];

  return (
    <div
      id="preview-canvas-container"
      className="flex items-start justify-center min-h-full py-8"
    >
      <div className={`${config.width} transition-all duration-200`}>
        {/* Device Label */}
        <div className="mb-2 text-xs text-gray-500 font-medium text-center">
          {config.label}
        </div>
        {/* Preview Frame */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6">
            <PageRenderer content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}

