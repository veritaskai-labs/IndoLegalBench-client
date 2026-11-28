import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { makeSections } from "@/test/versionFixtures";
import { CaseSectionList } from "./CaseSectionList";

describe("CaseSectionList", () => {
  it("names a section in English and leaves the title the author wrote", () => {
    render(
      <LocaleProvider locale="en">
        <CaseSectionList sections={makeSections()} />
      </LocaleProvider>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Pemberitahuan PHK")).toBeInTheDocument();
  });
});
