import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicationGateway } from "@/lib/reports/publicationApi";
import { session } from "@/test/authMock";
import { devTestReport, firstReport, publishedCandidates, savedCandidates } from "@/test/reportFixtures";

import { ReportPublishActions } from "./ReportPublishActions";

vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));

function fakeGateway(): PublicationGateway {
  return {
    publish: vi.fn().mockResolvedValue({ id: "pub-9", report_id: "r-1", version_no: 2, supersedes_id: "pub-1" }),
    listPublished: vi.fn().mockResolvedValue([]),
    replaceCandidates: vi.fn().mockResolvedValue(publishedCandidates([])),
  };
}

beforeEach(() => {
  session.role = "admin";
});

// SCRUM-335 (PBI-17 AC9, AC12): the Terbitkan button on one report.
describe("ReportPublishActions", () => {
  // Review #106: the page reloads the report after publishing, which unmounts this section, so the new version is
  // handed to the page (which shows it) instead of being kept here.
  it("offers Terbitkan to Admin on a saved Test report and hands the new version to the page", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<ReportPublishActions report={firstReport({ id: "r-1" })} gateway={fakeGateway()} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Terbitkan" }));
    await user.click(screen.getByRole("radio", { name: "Terbitkan sebagai laporan baru" }));
    const dialogs = screen.getAllByRole("button", { name: "Terbitkan" });
    await user.click(dialogs[dialogs.length - 1]);

    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith({ id: "pub-9", report_id: "r-1", version_no: 2, supersedes_id: "pub-1" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["developer_ai", "contributor", "viewer"] as const)("shows no Terbitkan button to %s", (role) => {
    session.role = role;

    render(<ReportPublishActions report={firstReport()} gateway={fakeGateway()} onChanged={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Terbitkan" })).not.toBeInTheDocument();
  });

  it("waits for the session before deciding", () => {
    session.role = null;

    const { container } = render(<ReportPublishActions report={firstReport()} gateway={fakeGateway()} onChanged={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  // AC12: a report with dev scores cannot be published, and the reason is on screen before anyone clicks.
  it("keeps Terbitkan off for a report with dev scores and says why", () => {
    render(<ReportPublishActions report={devTestReport()} gateway={fakeGateway()} onChanged={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Terbitkan" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/memuat skor dev, jadi tidak bisa diterbitkan/);
  });

  it("points a published report to the published list and gives Admin a Ganti versi button", () => {
    render(<ReportPublishActions report={firstReport({ status: "published" })} gateway={fakeGateway()} onChanged={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Terbitkan" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lihat daftar laporan terbit" })).toHaveAttribute("href", "/reports/published");
    expect(screen.getByRole("button", { name: "Ganti versi" })).toBeEnabled();
  });

  // SCRUM-335 "tombol ganti versi": Admin replaces this published report with a saved Test report of the same
  // products (SCRUM-373), offered by the server for this report.
  it("replaces this published report from its own page", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    const gateway = fakeGateway();
    vi.mocked(gateway.replaceCandidates).mockResolvedValue(savedCandidates());
    render(
      <ReportPublishActions
        report={firstReport({ id: "r-pub", status: "published" })}
        gateway={gateway}
        onChanged={onChanged}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ganti versi" }));
    const dialog = within(screen.getByRole("dialog", { name: "Ganti versi laporan?" }));
    await user.selectOptions(await dialog.findByRole("combobox", { name: "Laporan pengganti" }), "r-new");
    await user.click(dialog.getByRole("button", { name: "Ganti versi" }));

    expect(gateway.replaceCandidates).toHaveBeenCalledWith("r-pub");
    expect(gateway.publish).toHaveBeenCalledWith("r-new", "pub-1");
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: "pub-9" })));
  });

  it("does not show Ganti versi to other roles", () => {
    session.role = "viewer";

    render(<ReportPublishActions report={firstReport({ status: "published" })} gateway={fakeGateway()} onChanged={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Lihat daftar laporan terbit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ganti versi" })).not.toBeInTheDocument();
  });

  // AC9: an old version stays readable and says it was replaced.
  it("marks a replaced version as kept but no longer current, for every role", () => {
    session.role = "viewer";

    render(<ReportPublishActions report={firstReport({ status: "superseded" })} gateway={fakeGateway()} onChanged={vi.fn()} />);

    expect(screen.getByRole("note")).toHaveTextContent("Laporan ini sudah digantikan versi yang lebih baru. Versi ini tetap tersimpan.");
    expect(screen.getByRole("link", { name: "Lihat daftar laporan terbit" })).toBeInTheDocument();
  });
});
