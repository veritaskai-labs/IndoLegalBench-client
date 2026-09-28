import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LOGIN_URL } from "@/lib/auth";

import LoginPage from "./page";

const EXPIRED_MESSAGE = "Sesi Anda telah berakhir, silakan masuk kembali";

async function renderPage(reason?: string | string[]) {
  render(await LoginPage({ searchParams: Promise.resolve({ reason }) }));
}

describe("LoginPage", () => {
  it("renders the heading and a login link pointing to the backend OIDC flow", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Masuk" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Masuk dengan akun Veritask" })).toHaveAttribute(
      "href",
      LOGIN_URL,
    );
  });

  it("shows the self-service link as a placeholder until the Zitadel URL is decided", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "Lupa kata sandi atau masalah MFA" })).toHaveAttribute(
      "href",
      "#",
    );
  });

  it("shows the session expired banner when reason=expired", async () => {
    await renderPage("expired");

    expect(screen.getByRole("status")).toHaveTextContent(EXPIRED_MESSAGE);
  });

  it("uses the first value when reason is repeated in the query", async () => {
    await renderPage(["expired", "other"]);

    expect(screen.getByRole("status")).toHaveTextContent(EXPIRED_MESSAGE);
  });

  it("does not show the banner when there is no reason", async () => {
    await renderPage();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not show the banner for an unknown reason", async () => {
    await renderPage("other");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});