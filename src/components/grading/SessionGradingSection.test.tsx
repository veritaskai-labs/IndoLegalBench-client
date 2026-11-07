import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import type { RubricsGateway } from "@/lib/rubrics/rubricsApi";
import { gradingResponse } from "@/test/gradingFixtures";
import { makeFakeGateway, makeRubricSummary } from "@/test/rubricFixtures";
import type { Role } from "@/types";
import type { SessionStatus } from "@/types/measurement";
import { SessionGradingSection } from "./SessionGradingSection";

const NOT_GRADED = () => Promise.reject(new ApiError(404, "GRADING_NOT_FOUND"));

function renderSection({
  results,
  grade = () => Promise.resolve(gradingResponse()),
  role = "admin",
  status = "finished",
  archivedAt = null,
  // Without versions loaded the re-grade section shows nothing, so tests about grading are not disturbed.
  listVersions = () => new Promise(() => {}),
}: {
  results: GradingGateway["results"];
  grade?: GradingGateway["grade"];
  role?: Role | null;
  status?: SessionStatus;
  archivedAt?: string | null;
  listVersions?: RubricsGateway["listVersions"];
}) {
  const gateway: GradingGateway = { grade: vi.fn(grade), results: vi.fn(results), sessions: vi.fn() };
  const rubricsGateway = makeFakeGateway({ listVersions: vi.fn(listVersions) });
  render(
    <ToastProvider>
      <SessionGradingSection
        session={{ id: "s-1", label: "Run November", status, archived_at: archivedAt }}
        role={role}
        gateway={gateway}
        rubricsGateway={rubricsGateway}
      />
    </ToastProvider>,
  );
  return { gateway, rubricsGateway, section: screen.getByRole("region", { name: "Hasil penilaian" }) };
}

describe("SessionGradingSection (PBI-14 AC6, AC8)", () => {
  it("waits for the results before showing anything to act on", () => {
    const { section } = renderSection({ results: () => new Promise(() => {}) });

    expect(within(section).getByRole("status")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  it("shows the rubric version, the grading time, the three scores and the case table", async () => {
    const { section } = renderSection({ results: () => Promise.resolve(gradingResponse()) });

    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
    expect(within(section).getByRole("table", { name: "Skor per kasus" })).toBeInTheDocument();
    expect(section).toHaveTextContent("Versi rubrik v1");
    expect(section).toHaveTextContent("Dinilai 07 Nov 2026, 10.00 WIB");
  });

  // Edge: cases is optional in the contract (default_factory=list).
  it("shows an empty case table when the result carries no cases", async () => {
    const { section } = renderSection({ results: () => Promise.resolve(gradingResponse({ cases: undefined })) });

    expect(await within(section).findByRole("table", { name: "Skor per kasus" })).toHaveTextContent(
      "Belum ada kasus yang dinilai.",
    );
  });

  // Once there is a result, grading again is SCRUM-228's "Nilai ulang dengan versi terbaru".
  it("offers no Nilai once the session has a result", async () => {
    const { section } = renderSection({ results: () => Promise.resolve(gradingResponse()) });

    await within(section).findByRole("table", { name: "Skor sesi" });
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  it("lets Admin grade a session that has no result yet and then shows the result", async () => {
    const user = userEvent.setup();
    const results = vi
      .fn<GradingGateway["results"]>()
      .mockImplementationOnce(NOT_GRADED)
      .mockResolvedValueOnce(gradingResponse());
    const { section, gateway } = renderSection({ results });

    expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    await user.click(within(section).getByRole("button", { name: "Nilai" }));
    await user.click(within(screen.getByRole("dialog", { name: "Nilai sesi ini?" })).getByRole("button", { name: "Nilai" }));

    expect(gateway.grade).toHaveBeenCalledWith("s-1");
    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Sesi “Run November” selesai dinilai.")).toBeInTheDocument();
  });

  // AC6 and the binding rule: only Admin sees the action; the server still answers 403 to others.
  it.each<Role | null>(["developer_ai", "viewer", null])("shows %s an empty result without Nilai", async (role) => {
    const { section } = renderSection({ results: NOT_GRADED, role });

    expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  it.each<[string, SessionStatus, string | null]>([
    ["a queued session", "queued", null],
    ["an archived session", "finished", "2026-11-07T03:00:00Z"],
  ])("offers Admin no Nilai on %s", async (_name, status, archivedAt) => {
    const { section } = renderSection({ results: NOT_GRADED, status, archivedAt });

    expect(await within(section).findByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Nilai" })).not.toBeInTheDocument();
  });

  // server#114: Developer AI may not see the results of a running session.
  it("explains a refused result in the section and keeps the rest of the page", async () => {
    const { section } = renderSection({
      results: () => Promise.reject(new ApiError(403, "FORBIDDEN")),
      role: "developer_ai",
      status: "running",
    });

    expect(await within(section).findByText("Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.")).toBeInTheDocument();
  });

  it("offers a retry when the results fail to load", async () => {
    const user = userEvent.setup();
    const results = vi
      .fn<GradingGateway["results"]>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(gradingResponse());
    const { section } = renderSection({ results });

    await user.click(await within(section).findByRole("button", { name: /coba lagi/i }));

    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
  });

  // After a refusal the shown state may be stale (another Admin graded it first), so it reloads.
  it("reloads the results after a refused grading", async () => {
    const user = userEvent.setup();
    const results = vi
      .fn<GradingGateway["results"]>()
      .mockImplementationOnce(NOT_GRADED)
      .mockResolvedValueOnce(gradingResponse());
    const { section } = renderSection({ results, grade: () => Promise.reject(new ApiError(409, "SESSION_NOT_GRADABLE")) });

    await user.click(await within(section).findByRole("button", { name: "Nilai" }));
    const dialog = within(screen.getByRole("dialog", { name: "Nilai sesi ini?" }));
    await user.click(dialog.getByRole("button", { name: "Nilai" }));
    await dialog.findByRole("alert");
    await user.click(dialog.getByRole("button", { name: "Tutup" }));

    await waitFor(() => expect(results).toHaveBeenCalledTimes(2));
    expect(await within(section).findByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
  });

  it("closes the dialog without reloading on Batal", async () => {
    const user = userEvent.setup();
    const { section, gateway } = renderSection({ results: NOT_GRADED });

    await user.click(await within(section).findByRole("button", { name: "Nilai" }));
    await user.click(within(screen.getByRole("dialog", { name: "Nilai sesi ini?" })).getByRole("button", { name: "Batal" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(gateway.results).toHaveBeenCalledTimes(1);
  });

  // Re-grade (PBI-14 AC7): the result is shown once, and the re-grade button sits under it.
  describe("re-grade with the latest rubric", () => {
    const V1 = makeRubricSummary({ id: "id-1", version_no: 1, is_active: false });
    const V2 = makeRubricSummary({ id: "id-2", version_no: 2 });
    const BUTTON = "Nilai ulang dengan versi terbaru";

    it("offers Admin the re-grade of a graded session when a newer rubric version exists", async () => {
      const { section } = renderSection({
        results: () => Promise.resolve(gradingResponse({ rubric_version: "v1" })),
        listVersions: () => Promise.resolve([V1, V2]),
      });

      expect(await within(section).findByRole("button", { name: BUTTON })).toBeEnabled();
    });

    it("re-grades with the newest version, reloads the result and shows the new version as latest", async () => {
      const user = userEvent.setup();
      const results = vi
        .fn<GradingGateway["results"]>()
        .mockResolvedValueOnce(gradingResponse({ rubric_version: "v1" }))
        .mockResolvedValueOnce(gradingResponse({ rubric_version: "v2", kind: "regrade" }));
      const { section, gateway } = renderSection({ results, listVersions: () => Promise.resolve([V1, V2]) });

      await user.click(await within(section).findByRole("button", { name: BUTTON }));
      await user.click(
        within(screen.getByRole("dialog", { name: "Nilai ulang dengan versi terbaru?" })).getByRole("button", { name: "Nilai ulang" }),
      );

      await waitFor(() => expect(gateway.grade).toHaveBeenCalledWith("s-1", "v2"));
      await waitFor(() => expect(section).toHaveTextContent("Versi rubrik v2"));
      expect(results).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Penilaian ulang selesai dengan Versi 2.")).toBeInTheDocument();
    });

    // Only Admin may re-grade, and other roles must not call the Admin only rubric list.
    it.each<Role | null>(["developer_ai", "viewer", null])("shows %s the result without the re-grade button", async (role) => {
      const { section, rubricsGateway } = renderSection({
        results: () => Promise.resolve(gradingResponse()),
        role,
        listVersions: () => Promise.resolve([V1, V2]),
      });

      await within(section).findByRole("table", { name: "Skor sesi" });
      expect(within(section).queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
      expect(rubricsGateway.listVersions).not.toHaveBeenCalled();
    });

    // A session without a result has the Nilai button; re-grading would only repeat it.
    it("does not show the re-grade button before the first grading", async () => {
      const { section, rubricsGateway } = renderSection({ results: NOT_GRADED, listVersions: () => Promise.resolve([V1, V2]) });

      await within(section).findByText("Sesi ini belum dinilai.");
      expect(within(section).queryByRole("button", { name: BUTTON })).not.toBeInTheDocument();
      expect(rubricsGateway.listVersions).not.toHaveBeenCalled();
    });
  });
});
