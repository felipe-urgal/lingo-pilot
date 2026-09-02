import type {
  ContentValidationIssue,
  ContentValidationResult,
  LoadedContentDocument,
} from "./model.ts";
import { parseContentDocument } from "./schema.ts";
import { validateContentGraph } from "./validation.ts";

export type ContentInput = Readonly<{
  file: string;
  value: unknown;
}>;

export function validateContentInputs(
  inputs: readonly ContentInput[],
): ContentValidationResult {
  const documents: LoadedContentDocument[] = [];
  const issues: ContentValidationIssue[] = [];

  for (const input of inputs) {
    const parsed = parseContentDocument(input.value, input.file);
    issues.push(...parsed.issues);
    if (parsed.document) {
      documents.push({ file: input.file, document: parsed.document });
    }
  }

  issues.push(...validateContentGraph(documents));

  return {
    documents,
    issues: issues.toSorted((left, right) => {
      const fileOrder = left.file.localeCompare(right.file);
      if (fileOrder !== 0) return fileOrder;
      const pathOrder = left.path.localeCompare(right.path);
      if (pathOrder !== 0) return pathOrder;
      return left.rule.localeCompare(right.rule);
    }),
  };
}
