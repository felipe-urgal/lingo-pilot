import course from "../../../../content/courses/pt-BR_en/course.json" with { type: "json" };
import levelA0 from "../../../../content/courses/pt-BR_en/levels/a0/level.json" with { type: "json" };
import lessonA0Orientation from "../../../../content/courses/pt-BR_en/levels/a0/lesson-orientation.json" with { type: "json" };
import unitA0 from "../../../../content/courses/pt-BR_en/levels/a0/unit.json" with { type: "json" };
import levelA1 from "../../../../content/courses/pt-BR_en/levels/a1/level.json" with { type: "json" };
import unitA1 from "../../../../content/courses/pt-BR_en/levels/a1/unit.json" with { type: "json" };
import levelA2 from "../../../../content/courses/pt-BR_en/levels/a2/level.json" with { type: "json" };
import unitA2 from "../../../../content/courses/pt-BR_en/levels/a2/unit.json" with { type: "json" };
import {
  createCurriculumCatalog,
  validateContentInputs,
  type ContentInput,
  type CurriculumCatalog,
} from "../../../../packages/content/src/index.ts";

const inputs: readonly ContentInput[] = [
  { file: "course.json", value: course },
  { file: "level-a0.json", value: levelA0 },
  { file: "unit-a0.json", value: unitA0 },
  { file: "lesson-a0-orientation.json", value: lessonA0Orientation },
  { file: "level-a1.json", value: levelA1 },
  { file: "unit-a1.json", value: unitA1 },
  { file: "level-a2.json", value: levelA2 },
  { file: "unit-a2.json", value: unitA2 },
];

let catalog: CurriculumCatalog | undefined;

export function getEnglishCourseCatalog(): CurriculumCatalog {
  if (catalog) return catalog;

  const validation = validateContentInputs(inputs);
  if (validation.issues.length > 0) {
    throw new Error(
      `Authored curriculum is invalid: ${validation.issues
        .map((issue) => `${issue.file}:${issue.path} [${issue.rule}]`)
        .join(", ")}`,
    );
  }

  catalog = createCurriculumCatalog(
    validation.documents.map((document) => document.document),
    "course.en.ptbr.v1",
  );
  return catalog;
}
