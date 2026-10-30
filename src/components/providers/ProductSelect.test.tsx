import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ProductOptionsApi } from "@/hooks/useProductOptions";
import type { Role } from "@/types";
import type { AiProductOption, ProductPurpose } from "@/types/provider";
import { ProductSelect } from "./ProductSelect";

const { useAuthMock, replaceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

const JUSTISIO: AiProductOption = { id: "m1", name: "Justisio", measurement_type: "manual" };
const LEGALHERO: AiProductOption = { id: "m2", name: "LegalHero", measurement_type: "manual" };
const DEEPSEEK: AiProductOption = { id: "a1", name: "DeepSeek", measurement_type: "automatic" };

let api: { listProductOptions: ReturnType<typeof vi.fn> };
let onChange: Mock<(productId: string) => void>;

function signIn(role: Role) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id: "u1", name: "Uji", email: "uji@veritask.ai", role },
  });
}

function renderSelect(
  props: { purpose?: ProductPurpose; value?: string; label?: string } = {},
) {
  return render(
    <ProductSelect
      purpose={props.purpose ?? "manual_entry"}
      value={props.value ?? ""}
      onChange={onChange}
      label={props.label}
      api={api as unknown as ProductOptionsApi}
    />,
  );
}

beforeEach(() => {
  api = { listProductOptions: vi.fn() };
  onChange = vi.fn();
  replaceMock.mockReset();
  signIn("contributor");
});

describe("ProductSelect, choosing a product", () => {
  it("lists the active products under a placeholder and reports the chosen id", async () => {
    api.listProductOptions.mockResolvedValue([JUSTISIO, LEGALHERO]);
    renderSelect();

    const select = await screen.findByRole("combobox", { name: "Produk AI" });
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Pilih produk", "Justisio", "LegalHero"]);

    await userEvent.selectOptions(select, "LegalHero");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("m2");
  });

  it("does not render a product of the other type at all (AC7)", async () => {
    signIn("admin");
    api.listProductOptions.mockResolvedValue([DEEPSEEK, JUSTISIO]);
    renderSelect();

    await screen.findByRole("combobox", { name: "Produk AI" });
    expect(screen.queryByRole("option", { name: "DeepSeek" })).toBeNull();
  });

  it("shows the value it is given and the label of the page", async () => {
    api.listProductOptions.mockResolvedValue([JUSTISIO, LEGALHERO]);
    renderSelect({ value: "m1", label: "Produk yang diukur" });

    const select = await screen.findByRole("combobox", { name: "Produk yang diukur" });
    expect(select).toHaveValue("m1");
  });
});

describe("ProductSelect, states", () => {
  it("shows a spinner while the options load", () => {
    api.listProductOptions.mockReturnValue(new Promise(() => {}));
    renderSelect();

    expect(screen.getByRole("status")).toHaveTextContent("Memuat produk…");
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("says so when no product of that type is active", async () => {
    api.listProductOptions.mockResolvedValue([]);
    renderSelect();

    expect(await screen.findByText("Belum ada produk yang aktif.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("reports a failure and loads again on Coba lagi", async () => {
    api.listProductOptions.mockRejectedValueOnce(new Error("network")).mockResolvedValue([JUSTISIO]);
    renderSelect();

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat.");
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByRole("option", { name: "Justisio" })).toBeInTheDocument();
    expect(api.listProductOptions).toHaveBeenCalledTimes(2);
  });
});

describe("ProductSelect, role without the right", () => {
  it("sends the user to /forbidden without calling the server", async () => {
    renderSelect({ purpose: "automatic_run" });

    await waitFor(() => expect(replaceMock).toHaveBeenCalledExactlyOnceWith("/forbidden"));
    expect(api.listProductOptions).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("waits for the session instead of redirecting while it loads", () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    renderSelect();

    expect(screen.getByRole("status")).toHaveTextContent("Memuat produk…");
    expect(replaceMock).not.toHaveBeenCalled();
    expect(api.listProductOptions).not.toHaveBeenCalled();
  });
});
