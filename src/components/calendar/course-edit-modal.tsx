"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import CourseForm from "@/components/courses/course-form";

interface CourseEditModalProps {
  courseId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CourseEditModal({ courseId, onClose, onSaved }: CourseEditModalProps) {
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setCourseData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/courses/${courseId}`)
      .then((res) => res.json())
      .then((data) => {
        setCourseData({
          id: data.id,
          title: data.title,
          description: data.description,
          priceCents: data.priceCents,
          maxParticipants: data.maxParticipants,
          location: data.location,
          status: data.status,
          sessions: data.sessions?.map((s: any) => ({
            startAt: new Date(s.startAt),
            durationMinutes: s.durationMinutes || 60,
          })) || [],
        });
      })
      .catch((err) => {
        console.error("Fehler beim Laden des Kurses:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId]);

  if (!courseId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {loading ? "Lade Kurs..." : courseData ? "Kurs bearbeiten" : "Kurs nicht gefunden"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Schließen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Lade Kurs...</p>
            </div>
          ) : courseData ? (
            <CourseForm
              mode="edit"
              initialData={courseData}
              modalMode={true}
              onSaved={() => {
                onSaved();
                onClose();
              }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-red-600">Kurs nicht gefunden</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

