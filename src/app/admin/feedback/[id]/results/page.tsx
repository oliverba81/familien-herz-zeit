import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import Link from "next/link";
import AdminContainer from "@/components/admin/admin-container";
import AdminHeader from "@/components/admin/admin-header";
import FeedbackResponseDelete from "@/components/feedback/feedback-response-delete";
import { parseQuestions, parseAnswers } from "@/lib/feedback/types";
import { aggregateResponses } from "@/lib/feedback/aggregate";

export const dynamic = "force-dynamic";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} von 5 Sternen`}>
      {"★".repeat(value)}
      <span className="text-gray-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default async function FeedbackResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["ADMIN", "EDITOR"]);
  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const form = await db.feedbackForm.findUnique({ where: { id } });
  if (!form) {
    notFound();
  }

  const responses = await db.feedbackResponse.findMany({
    where: { formId: id },
    select: {
      id: true,
      name: true,
      email: true,
      answers: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const questions = parseQuestions(form.questions);
  const aggregates = aggregateResponses(questions, responses);

  // Lookup: questionId -> { label, options map }
  const questionMap = new Map(
    questions.map((q) => [
      q.id,
      {
        label: q.label,
        type: q.type,
        options:
          q.type === "SINGLE_CHOICE" || q.type === "MULTI_CHOICE"
            ? new Map(q.options.map((o) => [o.id, o.label]))
            : null,
      },
    ])
  );

  return (
    <AdminContainer>
      <AdminHeader />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Auswertung: {form.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {responses.length} Antwort(en)
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/feedback/${form.id}`}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Bearbeiten
            </Link>
            <Link
              href="/admin/feedback"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Zurück
            </Link>
          </div>
        </div>

        {/* Statistik */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Statistik</h2>
          {aggregates.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Fragen vorhanden.</p>
          ) : (
            aggregates.map((agg) => (
              <div
                key={agg.questionId}
                className="bg-white rounded-lg shadow p-5"
              >
                <h3 className="font-medium text-gray-900 mb-3">{agg.label}</h3>

                {(agg.type === "SINGLE_CHOICE" ||
                  agg.type === "MULTI_CHOICE") && (
                  <div className="space-y-2">
                    {agg.options.map((opt) => (
                      <div key={opt.optionId}>
                        <div className="flex justify-between text-sm text-gray-700 mb-1">
                          <span>{opt.label}</span>
                          <span className="text-gray-500">
                            {opt.count} ({opt.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="bg-rose-500 h-2.5 rounded-full"
                            style={{ width: `${opt.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-1">
                      {agg.totalAnswered} Person(en) haben geantwortet
                    </p>
                  </div>
                )}

                {agg.type === "RATING" && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      Durchschnitt:{" "}
                      <span className="font-semibold">{agg.average}</span> / 5
                      {" "}({agg.totalAnswered} Bewertung(en))
                    </p>
                    {agg.distribution
                      .slice()
                      .reverse()
                      .map((d) => (
                        <div key={d.stars}>
                          <div className="flex justify-between text-sm text-gray-700 mb-1">
                            <span>
                              <Stars value={d.stars} />
                            </span>
                            <span className="text-gray-500">
                              {d.count} ({d.percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="bg-amber-400 h-2.5 rounded-full"
                              style={{ width: `${d.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {agg.type === "FREE_TEXT" && (
                  <div className="space-y-2">
                    {agg.answers.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        Noch keine Antworten.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {agg.answers.map((text, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-wrap"
                          >
                            {text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* Einzelantworten */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Einzelantworten
          </h2>
          {responses.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Antworten.</p>
          ) : (
            responses.map((response) => {
              const answers = parseAnswers(response.answers);
              return (
                <div
                  key={response.id}
                  className="bg-white rounded-lg shadow p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm text-gray-500">
                      {new Date(response.createdAt).toLocaleString("de-DE")}
                      {response.name && (
                        <span className="ml-2 text-gray-700">
                          · {response.name}
                        </span>
                      )}
                      {response.email && (
                        <span className="ml-1 text-gray-500">
                          ({response.email})
                        </span>
                      )}
                    </div>
                    <FeedbackResponseDelete responseId={response.id} />
                  </div>
                  <dl className="space-y-2">
                    {Object.entries(answers).map(([qid, value]) => {
                      const meta = questionMap.get(qid);
                      const label = meta?.label ?? "(entfernte Frage)";
                      let display: string;
                      if (meta?.type === "RATING") {
                        display = `${value} / 5`;
                      } else if (
                        (meta?.type === "SINGLE_CHOICE" ||
                          meta?.type === "MULTI_CHOICE") &&
                        meta.options
                      ) {
                        if (Array.isArray(value)) {
                          display = value
                            .map((v) => meta.options?.get(v) ?? v)
                            .join(", ");
                        } else {
                          display =
                            meta.options.get(String(value)) ?? String(value);
                        }
                      } else if (Array.isArray(value)) {
                        display = value.join(", ");
                      } else {
                        display = String(value);
                      }
                      return (
                        <div key={qid}>
                          <dt className="text-xs font-medium text-gray-500">
                            {label}
                          </dt>
                          <dd className="text-sm text-gray-800 whitespace-pre-wrap">
                            {display}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })
          )}
        </section>
      </div>
    </AdminContainer>
  );
}
