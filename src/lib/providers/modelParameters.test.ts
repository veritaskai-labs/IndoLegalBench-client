import { describe, expect, it } from "vitest";

import {
  formatModelParams,
  MODEL_PARAMS_EXAMPLE,
  MODEL_PARAMS_INVALID_JSON,
  MODEL_PARAMS_NOT_OBJECT,
  parseModelParams,
} from "./modelParameters";

// SCRUM-248: parameter model diisi sebagai teks JSON (revisi UAT klien PBI-23 AC2).
describe("parseModelParams", () => {
  it("returns any JSON object unchanged, nested and unknown keys included", () => {
    const text = '{"reasoning_effort": "high", "thinking": {"type": "enabled"}, "top_p": 0.9}';

    expect(parseModelParams(text)).toEqual({
      params: { reasoning_effort: "high", thinking: { type: "enabled" }, top_p: 0.9 },
      error: null,
    });
  });

  it.each(["", "   ", "\n\t"])("treats empty text %j as provider defaults", (text) => {
    expect(parseModelParams(text)).toEqual({ params: null, error: null });
  });

  it("treats an empty object as provider defaults", () => {
    expect(parseModelParams("{ }")).toEqual({ params: null, error: null });
  });

  it.each(['{"effort": "high",}', "{effort: 'high'}", '{"a": 1'])(
    "rejects text that is not valid JSON: %s",
    (text) => {
      expect(parseModelParams(text)).toEqual({ params: null, error: MODEL_PARAMS_INVALID_JSON });
    },
  );

  it.each(['["effort", "high"]', "0.3", '"high"', "true", "null"])(
    "rejects JSON that is not an object: %s",
    (text) => {
      expect(parseModelParams(text)).toEqual({ params: null, error: MODEL_PARAMS_NOT_OBJECT });
    },
  );

  it("keeps a null value inside the object, because it belongs to the parameter", () => {
    expect(parseModelParams('{"stop": null}').params).toEqual({ stop: null });
  });

  it("parses the example it shows", () => {
    expect(parseModelParams(MODEL_PARAMS_EXAMPLE).error).toBeNull();
  });
});

describe("formatModelParams", () => {
  it("writes stored parameters as indented JSON", () => {
    expect(formatModelParams({ effort: "high", thinking: true })).toBe(
      '{\n  "effort": "high",\n  "thinking": true\n}',
    );
  });

  it.each([null, undefined, {}])("leaves the field empty for %j", (params) => {
    expect(formatModelParams(params)).toBe("");
  });

  it("round-trips through parseModelParams", () => {
    const params = { generation_config: { temperature: 0.3 } };
    expect(parseModelParams(formatModelParams(params)).params).toEqual(params);
  });
});
