"use client";

import { useState, useEffect } from "react";
import { X, Play } from "lucide-react";
import { HerzZeitStoryBlockData, HerzZeitStory } from "@/lib/page-builder/types";
import { cleanAndConvertHtml } from "@/lib/utils/html-links";

interface HerzZeitStoryBlockProps {
  data: HerzZeitStoryBlockData;
  disableModal?: boolean; // Wenn true, wird das Modal nicht geöffnet (z.B. im Page Builder)
}

interface StoryCardProps {
  story: HerzZeitStory;
  style?: "card" | "banner" | "minimal";
  backgroundColor?: string;
  onOpen: (story: HerzZeitStory) => void;
  disabled?: boolean; // Wenn true, ist die Karte nicht klickbar
}

function StoryCard({ story, style = "card", backgroundColor, onOpen, disabled = false }: StoryCardProps) {
  const getStyleClasses = () => {
    const baseClasses = disabled 
      ? "transition-all duration-500 opacity-75" 
      : "cursor-pointer transition-all duration-500 group relative overflow-hidden";
    
    switch (style) {
      case "banner":
        return `${baseClasses} p-8 rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 hover:from-rose-100 hover:via-pink-100 hover:to-rose-200 hover:border-rose-400 hover:shadow-2xl hover:scale-[1.02]`;
      case "minimal":
        return `${baseClasses} p-6 border-b-2 border-gray-200 hover:border-rose-500 hover:bg-rose-50/50`;
      case "card":
      default:
        return `${baseClasses} p-0 rounded-2xl bg-white shadow-lg hover:shadow-2xl hover:-translate-y-2 border border-gray-100 overflow-hidden`;
    }
  };

  const backgroundColorStyle = backgroundColor 
    ? (backgroundColor.startsWith("#") 
        ? { backgroundColor: backgroundColor }
        : {})
    : {};

  const backgroundColorClass = backgroundColor && !backgroundColor.startsWith("#")
    ? backgroundColor
    : "";

  if (style === "card") {
    return (
      <div
        onClick={disabled ? undefined : () => onOpen(story)}
        className={getStyleClasses() + (backgroundColorClass ? ` ${backgroundColorClass}` : "")}
        style={backgroundColorStyle}
      >
        {/* Gradient Overlay für Hover-Effekt */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/0 to-pink-500/0 group-hover:from-rose-500/5 group-hover:to-pink-500/5 transition-all duration-500 z-0" />
        
        <div className="relative z-10">
          {/* Bild - Groß und auffällig */}
          {story.imageUrl ? (
            <div className="relative h-64 overflow-hidden">
              <img
                src={story.imageUrl}
                alt={story.title || "Geschichten-Bild"}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
              {/* Gradient Overlay auf Bild */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Badges auf Bild */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {story.readingTime && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 backdrop-blur-sm text-gray-900 shadow-lg">
                    ⏱ {story.readingTime}
                  </span>
                )}
                {story.audioUrl && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-lg">
                    🎵 Audio
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-rose-100 via-pink-100 to-rose-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">📖</div>
                <div className="text-rose-600 font-semibold">HerzZeit-Geschichte</div>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-rose-600 transition-colors duration-300">
              {story.title}
            </h3>
            <p className="text-gray-600 mb-4 line-clamp-2 text-base leading-relaxed">
              {story.teaser}
            </p>
            
            {/* CTA Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-rose-600 font-semibold">
                <span className="text-sm">Geschichte öffnen</span>
                <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
              {!story.imageUrl && (
                <div className="flex items-center gap-3">
                  {story.readingTime && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {story.readingTime}
                    </span>
                  )}
                  {story.audioUrl && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                      🎵 Audio
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner und Minimal Styles
  return (
    <div
      onClick={disabled ? undefined : () => onOpen(story)}
      className={getStyleClasses() + (backgroundColorClass ? ` ${backgroundColorClass}` : "")}
      style={backgroundColorStyle}
    >
      <div className="flex items-start justify-between gap-6">
        {story.imageUrl && (
          <div className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden bg-gray-100 shadow-md group-hover:shadow-lg transition-shadow duration-300">
            <img
              src={story.imageUrl}
              alt={story.title || "Geschichten-Bild"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-rose-600 transition-colors duration-300">
            {story.title}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-2 text-base leading-relaxed">
            {story.teaser}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {story.readingTime && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 shadow-sm">
                ⏱ {story.readingTime}
              </span>
            )}
            {story.audioUrl && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 shadow-sm">
                🎵 Audio verfügbar
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-rose-600 font-semibold">
          <span className="text-sm">Öffnen</span>
          <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </div>
    </div>
  );
}

interface StoryModalProps {
  story: HerzZeitStory | null;
  isOpen: boolean;
  onClose: () => void;
}

function StoryModal({ story, isOpen, onClose }: StoryModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !story) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header mit Gradient */}
        <div className="relative bg-gradient-to-r from-rose-500 to-pink-500 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">
              {story.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              aria-label="Schließen"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Bild - Groß und auffällig */}
          {story.imageUrl && (
            <div className="w-full rounded-xl overflow-hidden shadow-xl">
              <img
                src={story.imageUrl}
                alt={story.title || "Geschichten-Bild"}
                className="w-full h-auto max-h-96 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Audio Player - Moderner */}
          {story.audioUrl && (
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border-2 border-rose-200 shadow-lg">
              <div className="mb-4">
                <span className="font-bold text-gray-900 text-lg">🎵 Audio anhören</span>
              </div>
              <audio
                controls
                className="w-full"
                src={story.audioUrl}
              >
                Dein Browser unterstützt das Audio-Element nicht.
              </audio>
            </div>
          )}

          {/* Volltext - Moderner Typography */}
          <div 
            className="prose prose-lg prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-rose-600 prose-a:hover:text-rose-700 prose-a:font-semibold prose-a:underline prose-strong:text-gray-900 max-w-none"
            dangerouslySetInnerHTML={{ __html: cleanAndConvertHtml(story.fullText || "") }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HerzZeitStoryBlock({ data, disableModal = false }: HerzZeitStoryBlockProps) {
  const [selectedStory, setSelectedStory] = useState<HerzZeitStory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenStory = (story: HerzZeitStory) => {
    if (disableModal) return; // Im Page Builder nicht öffnen
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStory(null);
  };

  const stories = data.stories || [];

  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        .herzzeit-story-block .block-title {
          font-size: 29px;
          font-weight: 700;
          color: #111827;
          margin-top: 48px;
          margin-bottom: 32px;
          text-align: center;
        }
        
        .herzzeit-story-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }
        
        @media (max-width: 768px) {
          .herzzeit-story-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
      `}</style>
      <div className="herzzeit-story-block">
        {/* Block-Überschrift */}
        {data.title && (
          <h2 
            className="block-title"
            dangerouslySetInnerHTML={{ __html: cleanAndConvertHtml(data.title) }}
          />
        )}

        {/* Geschichten - Grid Layout für moderneres Aussehen */}
        <div className="herzzeit-story-grid">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              style={data.style}
              backgroundColor={data.backgroundColor}
              onOpen={handleOpenStory}
              disabled={disableModal}
            />
          ))}
        </div>
      </div>

      {!disableModal && (
        <StoryModal
          story={selectedStory}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

