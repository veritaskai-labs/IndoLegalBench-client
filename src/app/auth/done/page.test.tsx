import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import AuthDonePage from "./page";

async function renderPage(error?: string | string[]) {
  const ui = await AuthDonePage({ searchParams: Promise.resolve({ error }) });
  render(ui);
}

beforeEach(() => {
  // /me never resolves, so the handler stays on its loading screen
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthDonePage", () => {
  it("shows the deactivated screen for ?error=USER_DEACTIVATED", async () => {
    await renderPage("USER_DEACTIVATED");
    expect(screen.getByText("Akun Anda telah dinonaktifkan")).toBeInTheDocument();
  });

  it("uses the first value when ?error is repeated", async () => {
    await renderPage(["USER_NOT_REGISTERED", "USER_DEACTIVATED"]);
    expect(screen.getByText("Akun Anda belum terdaftar")).toBeInTheDocument();
  });

  it("ignores an unknown error code and loads the profile instead", async () => {
    await renderPage("SOMETHING_ELSE");
    expect(screen.getByText("Memproses login Anda...")).toBeInTheDocument();
  });

  it("loads the profile when there is no error param", async () => {
    await renderPage();
    expect(screen.getByText("Memproses login Anda...")).toBeInTheDocument();
  });
});