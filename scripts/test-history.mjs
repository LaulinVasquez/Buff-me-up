import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = mkdtempSync(join(tmpdir(), "bmu-history-tests-"));
try {
  const program = ts.createProgram([join(root, "tests/history-progress.test.ts")], {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true,
    esModuleInterop: true, skipLibCheck: true, noEmitOnError: true,
    rootDir: root, outDir: output, types: ["node"],
  });
  const emitted = program.emit();
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics];
  if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
    }));
    process.exitCode = 1;
  } else {
    const result = spawnSync(process.execPath, ["--test", join(output, "tests/history-progress.test.js")], { stdio: "inherit" });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
