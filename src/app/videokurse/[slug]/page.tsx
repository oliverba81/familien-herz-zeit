import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { cachedVideoCourseById } from "@/lib/cache/prisma-cache";
import { absoluteUrl, buildOpenGraph } from "@/lib/seo/meta";
import { formatCents } from "@/lib/utils/money";
import { Metadata } from "next";
import VideoAccessRequestForm from "@/components/video-courses/video-access-request-form";
import PurchaseButton from "@/components/video-courses/purchase-button";
import PaypalButton from "@/components/video-courses/paypal-button";
import DiscountInputWrapper from "@/components/video-courses/discount-input-wrapper";
import { getAvailablePaymentMethods } from "@/lib/payment/config";

interface VideoCoursePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: VideoCoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await db.videoCourse.findUnique({
    where: { slug },
  });

  if (!course || course.status !== "PUBLISHED") {
    return {
      title: "Videokurs nicht gefunden",
    };
  }

  return {
    title: course.title,
    description: course.description,
  };
}

export default async function VideoCourseDetailPage({
  params,
}: VideoCoursePageProps) {
  const { slug } = await params;

  const course = await db.videoCourse.findUnique({
    where: { slug },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  // Verfügbare Online-Zahlungsarten (Videokurse: nur Stripe/PayPal,
  // da der Zugang sofort gewährt wird)
  const paymentMethods = await getAvailablePaymentMethods();

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {course.thumbnailUrl && (
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {course.title}
            </h1>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Preis</div>
                  <div className="text-3xl font-bold text-rose-500">
                    {course.priceCents === 0 ? "Kostenlos" : formatCents(course.priceCents)}
                  </div>
                </div>
                {course.durationSeconds && course.durationSeconds > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Dauer</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.round(course.durationSeconds / 60)} Minuten
                    </div>
                  </div>
                )}
              </div>

              {course.priceCents > 0 ? (
                <DiscountInputWrapper
                  videoCourseId={course.id}
                  priceCents={course.priceCents}
                  enabledMethods={{
                    stripe: paymentMethods.stripe,
                    paypal: paymentMethods.paypal,
                  }}
                />
              ) : (
                <VideoAccessRequestForm courseId={course.id} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

