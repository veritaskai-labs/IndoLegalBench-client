import { getCasesForSuite, type CaseSummary } from "@/lib/api/cases";
import type { CaseStatus } from "@/types/case";
import type { Suite } from "@/types/suite";

export type CaseDirectoryRow = {
  item: CaseSummary;
  suite: Pick<Suite, "id" | "name" | "status">;
};

// SCRUM-339: the global endpoint will replace these requests once its contract is available.
export async function listDirectoryCases(
  suites: readonly CaseDirectoryRow["suite"][],
  status?: CaseStatus,
): Promise<CaseDirectoryRow[]> {
  const rows: CaseDirectoryRow[] = [];
  const concurrency = 6;
  for (let offset = 0; offset < suites.length; offset += concurrency) {
    const batch = await Promise.all(suites.slice(offset, offset + concurrency).map(async (suite) => {
      const cases = await getCasesForSuite(suite.id, { status });
      return cases.filter(({ masked }) => !masked).map((item) => ({ item, suite }));
    }));
    rows.push(...batch.flat());
  }
  return rows;
}
