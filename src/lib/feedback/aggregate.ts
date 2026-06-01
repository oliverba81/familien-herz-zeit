import {
  FeedbackQuestion,
  FeedbackAnswers,
  parseAnswers,
  RATING_MIN,
  RATING_MAX,
} from "./types";

export interface ResponseLike {
  answers: unknown;
}

export interface OptionStat {
  optionId: string;
  label: string;
  count: number;
  percent: number;
}

export interface ChoiceAggregate {
  questionId: string;
  type: "SINGLE_CHOICE" | "MULTI_CHOICE";
  label: string;
  totalAnswered: number;
  options: OptionStat[];
}

export interface RatingAggregate {
  questionId: string;
  type: "RATING";
  label: string;
  totalAnswered: number;
  average: number;
  distribution: { stars: number; count: number; percent: number }[];
}

export interface FreeTextAggregate {
  questionId: string;
  type: "FREE_TEXT";
  label: string;
  answers: string[];
}

export type QuestionAggregate =
  | ChoiceAggregate
  | RatingAggregate
  | FreeTextAggregate;

function pct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

/** Reine Aggregation – kein DB-Import. */
export function aggregateResponses(
  questions: FeedbackQuestion[],
  responses: ResponseLike[]
): QuestionAggregate[] {
  const parsed: FeedbackAnswers[] = responses.map((r) =>
    parseAnswers(r.answers)
  );

  return questions.map((question): QuestionAggregate => {
    switch (question.type) {
      case "SINGLE_CHOICE":
      case "MULTI_CHOICE": {
        const counts = new Map<string, number>();
        let totalAnswered = 0;
        for (const answers of parsed) {
          const value = answers[question.id];
          if (question.type === "SINGLE_CHOICE") {
            if (typeof value === "string" && value) {
              counts.set(value, (counts.get(value) ?? 0) + 1);
              totalAnswered += 1;
            }
          } else {
            if (Array.isArray(value) && value.length > 0) {
              totalAnswered += 1;
              for (const v of value) {
                counts.set(v, (counts.get(v) ?? 0) + 1);
              }
            }
          }
        }
        return {
          questionId: question.id,
          type: question.type,
          label: question.label,
          totalAnswered,
          options: question.options.map((o) => {
            const count = counts.get(o.id) ?? 0;
            return {
              optionId: o.id,
              label: o.label,
              count,
              percent: pct(count, totalAnswered),
            };
          }),
        };
      }
      case "RATING": {
        const dist = new Map<number, number>();
        let sum = 0;
        let totalAnswered = 0;
        for (const answers of parsed) {
          const value = answers[question.id];
          if (
            typeof value === "number" &&
            Number.isInteger(value) &&
            value >= RATING_MIN &&
            value <= RATING_MAX
          ) {
            dist.set(value, (dist.get(value) ?? 0) + 1);
            sum += value;
            totalAnswered += 1;
          }
        }
        const distribution = [];
        for (let stars = RATING_MIN; stars <= RATING_MAX; stars++) {
          const count = dist.get(stars) ?? 0;
          distribution.push({
            stars,
            count,
            percent: pct(count, totalAnswered),
          });
        }
        return {
          questionId: question.id,
          type: "RATING",
          label: question.label,
          totalAnswered,
          average:
            totalAnswered > 0
              ? Math.round((sum / totalAnswered) * 100) / 100
              : 0,
          distribution,
        };
      }
      case "FREE_TEXT": {
        const texts: string[] = [];
        for (const answers of parsed) {
          const value = answers[question.id];
          if (typeof value === "string" && value.trim().length > 0) {
            texts.push(value);
          }
        }
        return {
          questionId: question.id,
          type: "FREE_TEXT",
          label: question.label,
          answers: texts,
        };
      }
    }
  });
}
