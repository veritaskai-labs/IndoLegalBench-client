import { describe, expect, it } from "vitest";

import { entityLabel } from "./entityLabels";

describe("entityLabel", () => {
  it("names the call log entity that the server audits since #88", () => {
    expect(entityLabel("call_log")).toBe("Log panggilan");
  });

  it("names the measurement session entity that the server audits since #91", () => {
    expect(entityLabel("measurement_session")).toBe("Sesi pengukuran");
  });

  it("names the rubric version entity that the server audits since #112", () => {
    expect(entityLabel("rubric_version")).toBe("Versi rubrik");
  });

  it("names the judge provider entity that the server audits since #118", () => {
    expect(entityLabel("judge_provider")).toBe("Provider penilai");
  });

  it("falls back to the raw type for an entity the client does not know yet", () => {
    expect(entityLabel("grading_run")).toBe("grading_run");
  });
});
