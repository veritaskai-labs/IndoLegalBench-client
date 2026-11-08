import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import type { JudgeProviderOption } from "@/types/provider";
import { JudgeProviderSelect } from "./JudgeProviderSelect";

const DEEPSEEK: JudgeProviderOption = {
  id: "8b47374e-0000-4000-8000-000000000001",
  name: "DeepSeek V4-Flash",
  provider_type: "openai_compatible",
  model_name: "deepseek-v4-flash",
};
const GEMINI: JudgeProviderOption = {
  id: "8b47374e-0000-4000-8000-000000000002",
  name: "Gemini 2.5 Pro",
  provider_type: "openai_compatible",
  model_name: "gemini-2.5-pro",
};

let api: { listJudgeOptions: ReturnType<typeof vi.fn> };
let onChange: Mock<(judgeId: string) => void>;

function renderSelect(props: { value?: string; disabled?: boolean } = {}) {
  return render(
    <JudgeProviderSelect
      value={props.value ?? ""}
      onChange={onChange}
      disabled={props.disabled}
      api={api as unknown as JudgeOptionsApi}
    />,
  );
}

beforeEach(() => {
  api = { listJudgeOptions: vi.fn() };
  onChange = vi.fn();
});

describe("JudgeProviderSelect", () => {
  it("lists the registered judges under a placeholder with their ids as values", async () => {
    // Arrange
    api.listJudgeOptions.mockResolvedValue([DEEPSEEK, GEMINI]);

    // Act
    renderSelect();

    // Assert
    const select = await screen.findByRole("combobox", {
      name: /Provider Penilai/i,
    });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Pilih provider penilai",
      "DeepSeek V4-Flash",
      "Gemini 2.5 Pro",
    ]);
    expect(
      screen.getByRole("option", { name: "DeepSeek V4-Flash" }),
    ).toHaveValue(DEEPSEEK.id);
    expect(select).toHaveValue("");
  });

  it("reports the chosen id, never a placeholder string", async () => {
    // Arrange
    const user = userEvent.setup();
    api.listJudgeOptions.mockResolvedValue([DEEPSEEK, GEMINI]);
    renderSelect();
    const select = await screen.findByRole("combobox", {
      name: /Provider Penilai/i,
    });

    // Act
    await user.selectOptions(select, GEMINI.id);

    // Assert
    expect(onChange).toHaveBeenCalledWith(GEMINI.id);
  });

  it("shows the selected judge from the value prop", async () => {
    // Arrange
    api.listJudgeOptions.mockResolvedValue([DEEPSEEK, GEMINI]);

    // Act
    renderSelect({ value: DEEPSEEK.id });

    // Assert
    expect(
      await screen.findByRole("combobox", { name: /Provider Penilai/i }),
    ).toHaveValue(DEEPSEEK.id);
  });

  it("shows a loading note while the list is on its way", () => {
    // Arrange
    api.listJudgeOptions.mockReturnValue(new Promise(() => {}));

    // Act
    renderSelect();

    // Assert
    expect(screen.getByText("Memuat provider penilai…")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("explains that no active judge exists instead of showing an empty select", async () => {
    // Arrange
    api.listJudgeOptions.mockResolvedValue([]);

    // Act
    renderSelect();

    // Assert
    expect(
      await screen.findByText(/Belum ada provider penilai yang aktif/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("offers a retry when the list fails to load", async () => {
    // Arrange
    const user = userEvent.setup();
    api.listJudgeOptions.mockRejectedValueOnce(new Error("boom"));
    api.listJudgeOptions.mockResolvedValueOnce([DEEPSEEK]);
    renderSelect();

    // Act
    await user.click(await screen.findByRole("button", { name: /Coba lagi/i }));

    // Assert
    expect(
      await screen.findByRole("option", { name: "DeepSeek V4-Flash" }),
    ).toBeInTheDocument();
    expect(api.listJudgeOptions).toHaveBeenCalledTimes(2);
  });

  it("can be disabled while a session is being started", async () => {
    // Arrange
    api.listJudgeOptions.mockResolvedValue([DEEPSEEK]);

    // Act
    renderSelect({ disabled: true });

    // Assert
    expect(
      await screen.findByRole("combobox", { name: /Provider Penilai/i }),
    ).toBeDisabled();
  });
});
