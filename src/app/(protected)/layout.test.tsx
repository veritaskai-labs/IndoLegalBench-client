import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useToast } from "@/components/ui/Toast";
import ProtectedLayout from "./layout";

// The layout only composes these pieces; each has its own tests. Stubbing
// them keeps this test about the composition (auth, then toast) alone.
vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/layout/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/layout/TopBar", () => ({ TopBar: () => <header>topbar</header> }));
vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => <nav>sidebar</nav> }));

function SavePage() {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast("Kasus tersimpan sebagai draf")}>
      simpan
    </button>
  );
}

describe("ProtectedLayout", () => {
  it("renders the page inside the shell", () => {
    render(
      <ProtectedLayout>
        <p>isi halaman</p>
      </ProtectedLayout>,
    );

    expect(screen.getByText("isi halaman")).toBeInTheDocument();
    expect(screen.getByText("topbar")).toBeInTheDocument();
    expect(screen.getByText("sidebar")).toBeInTheDocument();
  });

  it("gives every protected page a toast that outlives page navigation", () => {
    render(
      <ProtectedLayout>
        <SavePage />
      </ProtectedLayout>,
    );

    fireEvent.click(screen.getByRole("button", { name: "simpan" }));

    expect(screen.getByRole("status", { name: "Notifikasi" })).toHaveTextContent(
      "Kasus tersimpan sebagai draf",
    );
  });
});
