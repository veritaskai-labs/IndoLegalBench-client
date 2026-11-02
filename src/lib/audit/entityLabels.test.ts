import { describe, expect, it } from "vitest";

import { entityLabel } from "./entityLabels";

describe("entityLabel", () => {
  it("names the call log entity that the server audits since #88", () => {
    expect(entityLabel("call_log")).toBe("Log panggilan");
  });

  it("falls back to the raw type for an entity the client does not know yet", () => {
    expect(entityLabel("measurement_session")).toBe("measurement_session");
  });
});
