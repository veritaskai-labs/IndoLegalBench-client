import { describe, expect, it } from "vitest";

import type { JudgeProviderOption } from "@/types/provider";
import { isUnavailableJudge } from "./judgeChoice";

const ACTIVE: JudgeProviderOption[] = [
  { id: "judge-a", name: "DeepSeek", provider_type: "openai_compatible", model_name: "deepseek-chat" },
];

describe("isUnavailableJudge (review client#92)", () => {
  // Positive: a judge that was turned off is no longer a valid choice.
  it("is true for a chosen id that is not in the active list", () => {
    expect(isUnavailableJudge("judge-gone", ACTIVE)).toBe(true);
  });

  // Negative: a judge that is still active stays chosen.
  it("is false for a chosen id that is still active", () => {
    expect(isUnavailableJudge("judge-a", ACTIVE)).toBe(false);
  });

  // Edge: nothing chosen yet is not a missing judge.
  it("is false when nothing is chosen", () => {
    expect(isUnavailableJudge("", ACTIVE)).toBe(false);
  });

  // Edge: with no active judge at all, any remembered choice is gone.
  it("is true for any choice when no judge is active", () => {
    expect(isUnavailableJudge("judge-a", [])).toBe(true);
  });
});
