import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export type SourceFile = { path: string; lines: string[] };

/** Every non-test .ts/.tsx file under `dir`, with repo-relative forward-slash paths. */
export function sourceFiles(dir: string): SourceFile[] {
  const root = process.cwd();
  return readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => {
      const full = join(entry.parentPath, entry.name);
      return { path: relative(root, full).replaceAll("\\", "/"), lines: readFileSync(full, "utf8").split("\n") };
    });
}

/** `path:line` for each line where `isViolation` holds. */
export function violations(
  files: SourceFile[],
  isViolation: (line: string, index: number, lines: string[]) => boolean,
): string[] {
  return files.flatMap((file) =>
    file.lines.flatMap((line, index) => (isViolation(line, index, file.lines) ? [`${file.path}:${index + 1}`] : [])),
  );
}

/** Files that still have a violation; a known entry missing here means the bug was fixed. */
export function filesWith(found: string[]): string[] {
  return [...new Set(found.map((hit) => hit.slice(0, hit.lastIndexOf(":"))))].sort();
}
