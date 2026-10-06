import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders every item in order", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Suite", href: "/suites" },
          { label: "Hukum Ketenagakerjaan", href: "/suites/abc" },
          { label: "KTK-001" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("Suite");
    expect(nav).toHaveTextContent("Hukum Ketenagakerjaan");
    expect(nav).toHaveTextContent("KTK-001");
  });

  it("renders an item with href as a link", () => {
    render(
      <Breadcrumb items={[{ label: "Suite", href: "/suites" }, { label: "KTK-001" }]} />,
    );

    expect(screen.getByRole("link", { name: "Suite" })).toHaveAttribute("href", "/suites");
  });

  it("marks the last item as the current page and does not link it", () => {
    render(
      <Breadcrumb items={[{ label: "Suite", href: "/suites" }, { label: "KTK-001" }]} />,
    );

    expect(screen.getByText("KTK-001")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "KTK-001" })).not.toBeInTheDocument();
  });

  it("renders an item with onClick as a button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Breadcrumb items={[{ label: "Suite", onClick }, { label: "KTK-001" }]} />);

    await user.click(screen.getByRole("button", { name: "Suite" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("falls back to a placeholder when a label is still loading", () => {
    render(
      <Breadcrumb
        items={[{ label: "Suite", href: "/suites" }, { label: null }]}
      />,
    );

    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("ignores an item that has neither href nor onClick", () => {
    render(
      <Breadcrumb
        items={[{ label: "Suite" }, { label: "Hukum Ketenagakerjaan" }]}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Suite")).toBeInTheDocument();
  });

  it("keeps each separator inside its item, so a wrap never starts with one", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Suite", href: "/suites" },
          { label: "Hukum Ketenagakerjaan", href: "/suites/abc" },
          { label: "KTK-001" },
        ]}
      />,
    );

    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent("›");
    expect(items[2]).toHaveTextContent("›");
  });

});