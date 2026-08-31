import { access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";

const source = ".env.example";
const target = ".env.local";

try {
  await access(target, constants.F_OK);
  console.log(`[env] ${target} already exists; leaving it unchanged.`);
} catch (error) {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    error.code !== "ENOENT"
  ) {
    throw error;
  }

  await copyFile(source, target, constants.COPYFILE_EXCL);
  console.log(`[env] created ${target} from ${source}.`);
}
