import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

await mkdir("work/writing-tests", { recursive: true });
for (const name of ["storageDatabase", "storage", "sync-content", "sync", "backup", "website-client", "folderSync", "importers/types", "importers/documentParsing", "importers/importCommit"]) {
  const source = await readFile(`mobile/${name}.ts`, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from "(\.{1,2}\/[^".]+)"/g, 'from "$1.mjs"');
  await mkdir(`work/writing-tests/${name.split("/").slice(0, -1).join("/")}`, { recursive: true });
  await writeFile(`work/writing-tests/${name}.mjs`, compiled);
}
const result = spawnSync(process.execPath, ["--test", "tests/writing-data.test.mjs", "tests/website-upload.test.mjs", "tests/import-data.test.mjs", "tests/folder-sync.test.mjs", "tests/sync-content.test.mjs"], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
