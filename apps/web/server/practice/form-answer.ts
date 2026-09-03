import type { PersistedActivityAnswer } from "../../../../packages/domain/src/index.ts";
import type { PracticeActivity } from "./activity-catalog";

function stringValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function parsePracticeFormAnswer(
  activity: PracticeActivity,
  formData: FormData,
): PersistedActivityAnswer | null {
  switch (activity.presentation.type) {
    case "single-choice":
    case "fill-blank":
    case "short-answer":
    case "translation":
      return stringValue(formData.get("answer"));
    case "multiple-choice": {
      const answers = formData
        .getAll("answer")
        .filter((value): value is string => typeof value === "string");
      return answers.length > 0 ? answers : null;
    }
    case "word-order": {
      const answers = formData
        .getAll("answer")
        .filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        );
      return answers.length === activity.presentation.tokens.length ? answers : null;
    }
    case "matching": {
      const answer: Record<string, string> = {};
      for (const pair of activity.presentation.pairs) {
        const value = stringValue(formData.get(`match:${pair.leftId}`));
        if (!value) return null;
        answer[pair.leftId] = value;
      }
      return answer;
    }
  }
}
