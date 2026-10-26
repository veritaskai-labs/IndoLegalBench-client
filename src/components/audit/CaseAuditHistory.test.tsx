import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { listAuditLogs } from "@/lib/audit/auditApi";
import { makeAuditEntry, makeAuditPage } from "@/test/auditFixtures";
import { CaseAuditHistory } from "./CaseAuditHistory";

vi.mock("@/lib/audit/auditApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit/auditApi")>();
  return { ...actual, listAuditLogs: vi.fn() };
});
const list = vi.mocked(listAuditLogs);

beforeEach(() => {
  list.mockReset();
});

describe("CaseAuditHistory", () => {
  describe("saat riwayat dimuat", () => {
    it("shows a loading state and asks only for this case", () => {
      list.mockReturnValue(new Promise(() => {}));

      render(<CaseAuditHistory caseId="case-1" />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ case_id: "case-1" }));
    });
  });

  describe("kasus tanpa catatan", () => {
    it("says there is no history yet instead of an empty table", async () => {
      list.mockResolvedValue(makeAuditPage([]));

      render(<CaseAuditHistory caseId="case-1" />);

      expect(await screen.findByText("Belum ada riwayat")).toBeInTheDocument();
      expect(screen.getByText("Belum ada perubahan tercatat untuk kasus ini.")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("kasus dengan catatan", () => {
    it("lists who did what, with the 90 day retention note", async () => {
      list.mockResolvedValue(
        makeAuditPage([
          makeAuditEntry({ id: 1, actor_name: "Herdayani", action: "case.updated" }),
          makeAuditEntry({ id: 2, actor_name: "Roben", action: "case.submitted" }),
        ]),
      );

      render(<CaseAuditHistory caseId="case-1" />);

      expect(
        await screen.findByText("Catatan disimpan 90 hari, lalu dihapus otomatis."),
      ).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Herdayani")).toBeInTheDocument();
      expect(screen.getByText("Author mengajukan kasus untuk review")).toBeInTheDocument();
    });
  });

  describe("pembagian halaman", () => {
    it("hides the pager when every entry fits on one page", async () => {
      list.mockResolvedValue(makeAuditPage([makeAuditEntry()]));

      render(<CaseAuditHistory caseId="case-1" />);

      expect(await screen.findByRole("table")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Berikutnya" })).not.toBeInTheDocument();
    });

    it("shows the pager when the case has more entries than one page", async () => {
      list.mockResolvedValue(makeAuditPage([makeAuditEntry()], 45));

      render(<CaseAuditHistory caseId="case-1" />);

      expect(await screen.findByText("Halaman 1 dari 3")).toBeInTheDocument();
    });

    it("asks for the next page of this case", async () => {
      list.mockResolvedValue(makeAuditPage([makeAuditEntry()], 45));
      const user = userEvent.setup();
      render(<CaseAuditHistory caseId="case-1" />);

      await user.click(await screen.findByRole("button", { name: "Berikutnya" }));

      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ case_id: "case-1", page: 2 }),
      );
    });
  });

  describe("membuka satu catatan", () => {
    const entries = [
      makeAuditEntry({ id: 1, actor_name: "Herdayani", action: "case.updated" }),
      makeAuditEntry({
        id: 2,
        actor_name: "Roben",
        action: "case.submitted",
        before: { status: "draft" },
        after: { status: "in_review" },
      }),
    ];

    it("shows the before and after values of the row that was clicked", async () => {
      list.mockResolvedValue(makeAuditPage(entries));
      const user = userEvent.setup();
      render(<CaseAuditHistory caseId="case-1" />);

      await user.click(await screen.findByText("Roben"));

      const detail = screen.getByRole("dialog", { name: "Detail catatan audit" });
      expect(detail).toHaveTextContent("case.submitted");
      expect(detail).toHaveTextContent("draft");
      expect(detail).toHaveTextContent("in_review");
    });

    it("opens the detail as a dialog outside the history tab, not under the list", async () => {
      list.mockResolvedValue(makeAuditPage(entries));
      const user = userEvent.setup();
      const { container } = render(<CaseAuditHistory caseId="case-1" />);

      await user.click(await screen.findByText("Roben"));

      const detail = screen.getByRole("dialog", { name: "Detail catatan audit" });
      expect(detail).toHaveAttribute("aria-modal", "true");
      expect(container).not.toContainElement(detail);
    });

    it("closes the detail with Escape and keeps the list", async () => {
      list.mockResolvedValue(makeAuditPage(entries));
      const user = userEvent.setup();
      render(<CaseAuditHistory caseId="case-1" />);
      await user.click(await screen.findByText("Roben"));

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("closes the detail with Tutup and keeps the list", async () => {
      list.mockResolvedValue(makeAuditPage(entries));
      const user = userEvent.setup();
      render(<CaseAuditHistory caseId="case-1" />);
      await user.click(await screen.findByText("Roben"));

      await user.click(screen.getByRole("button", { name: "Tutup" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("riwayat gagal dimuat", () => {
    it("says the reviewer is not assigned and offers no retry on 403", async () => {
      list.mockRejectedValue(new ApiError(403, "FORBIDDEN"));

      render(<CaseAuditHistory caseId="case-1" />);

      expect(
        await screen.findByText("Anda tidak ditugaskan untuk mereview kasus ini."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Coba lagi" })).not.toBeInTheDocument();
    });

    it.each([
      ["a server error", new ApiError(500, "INTERNAL_ERROR")],
      ["a dropped connection", new TypeError("Failed to fetch")],
    ])("offers a retry after %s", async (_, error) => {
      list.mockRejectedValue(error);

      render(<CaseAuditHistory caseId="case-1" />);

      expect(await screen.findByText("Gagal memuat riwayat kasus.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
    });

    it("loads the history again when the reader retries", async () => {
      list
        .mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"))
        .mockResolvedValueOnce(makeAuditPage([]));
      const user = userEvent.setup();
      render(<CaseAuditHistory caseId="case-1" />);

      await user.click(await screen.findByRole("button", { name: "Coba lagi" }));

      expect(await screen.findByText("Belum ada riwayat")).toBeInTheDocument();
      expect(list).toHaveBeenCalledTimes(2);
    });
  });
});
