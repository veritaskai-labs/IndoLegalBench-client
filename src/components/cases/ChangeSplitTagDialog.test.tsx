import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { ChangeSplitTagDialog } from "./ChangeSplitTagDialog";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);
const CASE_ID = "11111111-1111-1111-1111-111111111111";

function renderDialog(current: "dev" | "test" = "dev") {
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(
    <ChangeSplitTagDialog caseId={CASE_ID} caseCode="KTK-001" current={current} onClose={onClose} onDone={onDone} />,
  );
  return { onDone, onClose, user: userEvent.setup() };
}

function sentBody() {
  return JSON.parse(String(apiFetchMock.mock.calls[0][1]?.body));
}

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("ChangeSplitTagDialog", () => {
  // Positive
  it("opens on the current tag with nothing to save yet", () => {
    // Act
    renderDialog("dev");

    // Assert
    expect(screen.getByRole("dialog", { name: "Ubah tag KTK-001" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dev set" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Simpan tag" })).toBeDisabled();
  });

  it("warns before moving a dev case to test and waits for the confirmation (PBI-9 AC3)", async () => {
    // Arrange
    const { user } = renderDialog("dev");

    // Act
    await user.click(screen.getByRole("radio", { name: "Test set" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("sudah pernah dipakai sebagai dev set");
    expect(screen.getByRole("button", { name: "Simpan tag" })).toBeDisabled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("sends confirm = true once the admin confirms dev to test", async () => {
    // Arrange
    const { user, onDone } = renderDialog("dev");
    const saved = { id: CASE_ID, split_tag: "test", was_dev: true };
    apiFetchMock.mockResolvedValue(saved);
    await user.click(screen.getByRole("radio", { name: "Test set" }));
    await user.click(screen.getByRole("checkbox", { name: /Saya paham/ }));

    // Act
    await user.click(screen.getByRole("button", { name: "Simpan tag" }));

    // Assert
    expect(apiFetchMock.mock.calls[0][0]).toBe(`/cases/${CASE_ID}/split-tag`);
    expect(sentBody()).toEqual({ split_tag: "test", confirm: true });
    expect(onDone).toHaveBeenCalledWith(saved);
  });

  it("moves a test case to dev without the warning", async () => {
    // Arrange
    const { user } = renderDialog("test");
    apiFetchMock.mockResolvedValue({ id: CASE_ID, split_tag: "dev" });

    // Act
    await user.click(screen.getByRole("radio", { name: "Dev set" }));
    await user.click(screen.getByRole("button", { name: "Simpan tag" }));

    // Assert
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(sentBody()).toEqual({ split_tag: "dev", confirm: false });
  });

  // Negative
  it("shows the server's reason and keeps the dialog open when the change fails", async () => {
    // Arrange
    const { user, onDone } = renderDialog("test");
    apiFetchMock.mockRejectedValue(new ApiError(422, "SUITE_NOT_ACTIVE", null, null));

    // Act
    await user.click(screen.getByRole("radio", { name: "Dev set" }));
    await user.click(screen.getByRole("button", { name: "Simpan tag" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("diarsipkan");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("closes without saving on cancel", async () => {
    // Arrange
    const { user, onClose } = renderDialog("dev");

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Assert
    expect(onClose).toHaveBeenCalled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  // Edge
  it("unticks the confirmation when the admin switches back to the current tag", async () => {
    // Arrange
    const { user } = renderDialog("dev");
    await user.click(screen.getByRole("radio", { name: "Test set" }));
    await user.click(screen.getByRole("checkbox", { name: /Saya paham/ }));

    // Act
    await user.click(screen.getByRole("radio", { name: "Dev set" }));
    await user.click(screen.getByRole("radio", { name: "Test set" }));

    // Assert
    expect(screen.getByRole("checkbox", { name: /Saya paham/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Simpan tag" })).toBeDisabled();
  });
});
