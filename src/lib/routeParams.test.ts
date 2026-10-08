import { describe, expect, it } from "vitest";
import { decodeRouteParam } from "./routeParams";

describe("decodeRouteParam", () => {
  // Positive
  it("returns a plain UUID unchanged", () => {
    expect(decodeRouteParam("28af7c25-042e-4bc1-8d13-21c41c2241e9")).toBe(
      "28af7c25-042e-4bc1-8d13-21c41c2241e9",
    );
  });

  it("decodes a segment that useParams hands back still encoded", () => {
    expect(decodeRouteParam("%7Bid%7D")).toBe("{id}");
  });

  // Negative
  it("returns the raw value when it is not valid percent-encoding", () => {
    expect(decodeRouteParam("%E0%A4%A")).toBe("%E0%A4%A");
  });

  // Corner
  it("decodes only once, so an encoded percent sign stays a percent sign", () => {
    expect(decodeRouteParam("%2525")).toBe("%25");
  });
});
