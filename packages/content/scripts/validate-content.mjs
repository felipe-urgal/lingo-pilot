import { access } from "node:fs/promises";
import { constants } from "node:fs";

const authoredContentRoot = new URL("../../../content/", import.meta.url);

try {
  await access(authoredContentRoot, constants.F_OK);
  console.log(
    "Content validation hook is active. Authored content exists, but schema/reference validation is intentionally deferred to issue #15.",
  );
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    console.log(
      "Content validation hook is active. No authored content directory exists yet; full validation arrives in issue #15.",
    );
    process.exit(0);
  }

  throw error;
}
