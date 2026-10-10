import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LockedVersionNotice } from "./LockedVersionNotice";

const idle = { approved: true, canStart: true, pending: false, error: null, onStart: vi.fn() };

describe("LockedVersionNotice", () => {
  // Positive: AC1 and AC6, the button and the re-review explanation.
  it("explains that a new version will be reviewed again and keeps the approved one in effect", () => {
    // Arrange / Act
    render(<LockedVersionNotice {...idle} />);

    // Assert
    expect(screen.getByRole("region", { name: "Versi terkunci" })).toHaveTextContent(
      "versi baru yang harus ditinjau ulang",
    );
    expect(screen.getByRole("region", { name: "Versi terkunci" })).toHaveTextContent(
      "versi yang disetujui tetap berlaku",
    );
    expect(screen.getByRole("button", { name: "Edit (buat versi baru)" })).toBeEnabled();
  });

  it("calls onStart when the button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<LockedVersionNotice {...idle} onStart={onStart} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Edit (buat versi baru)" }));

    // Assert
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("disables the button and says it is working while pending", () => {
    // Arrange / Act
    render(<LockedVersionNotice {...idle} pending />);

    // Assert
    expect(screen.getByRole("button", { name: "Membuat versi baru…" })).toBeDisabled();
  });

  // Negative
  it("shows the error message from the server", () => {
    // Arrange / Act
    render(<LockedVersionNotice {...idle} error="Sudah ada versi baru yang sedang dikerjakan." />);

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Sudah ada versi baru yang sedang dikerjakan.");
  });

  it("explains the lock but offers no button to someone who may not start a version", () => {
    // Arrange / Act
    render(<LockedVersionNotice {...idle} canStart={false} />);

    // Assert
    expect(screen.getByRole("region", { name: "Versi terkunci" })).toHaveTextContent("sudah disetujui");
    expect(screen.queryByRole("button", { name: "Edit (buat versi baru)" })).not.toBeInTheDocument();
  });

  // Edge: a case in review is locked too, but cannot be forked.
  it("says the case is in review and has no button, even if the role could start a version", () => {
    // Arrange / Act
    render(<LockedVersionNotice {...idle} approved={false} />);

    // Assert
    expect(screen.getByRole("region", { name: "Versi terkunci" })).toHaveTextContent("sedang ditinjau");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
