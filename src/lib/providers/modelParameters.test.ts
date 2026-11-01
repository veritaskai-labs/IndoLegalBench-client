import { describe, expect, it } from "vitest";

import {
  fromModelParams,
  MODEL_PARAMETER_FIELDS,
  modelParamsError,
  toModelParams,
} from "./modelParameters";

describe("MODEL_PARAMETER_FIELDS (AC2)", () => {
  it("lists the four parameters the client asked for", () => {
    expect(MODEL_PARAMETER_FIELDS.map((field) => field.key)).toEqual([
      "temperature",
      "effort",
      "thinking",
      "web_search",
    ]);
  });

  it("offers 0.3 as the starting temperature", () => {
    const temperature = MODEL_PARAMETER_FIELDS.find(
      (field) => field.key === "temperature",
    );

    expect(temperature?.placeholder).toBe("0.3");
  });

  it("offers three levels of effort", () => {
    const effort = MODEL_PARAMETER_FIELDS.find(
      (field) => field.key === "effort",
    );

    expect(effort?.choices?.map((choice) => choice.value)).toEqual([
      "low",
      "medium",
      "high",
    ]);
  });
  it("offers on and off for the booleans, so the default can be overridden", () => {
    const thinking = MODEL_PARAMETER_FIELDS.find(
      (field) => field.key === "thinking",
    );

    expect(thinking?.choices?.map((choice) => choice.value)).toEqual([
      "on",
      "off",
    ]);
  });
});

describe("modelParamsError", () => {
  it("accepts an empty temperature, because every parameter is optional", () => {
    expect(modelParamsError({})).toBeNull();
  });

  it("accepts a temperature inside the range", () => {
    expect(modelParamsError({ temperature: "0.3" })).toBeNull();
  });

  it("rejects a temperature that is not a number", () => {
    expect(modelParamsError({ temperature: "panas" })).toBe(
      "Temperature harus angka antara 0 dan 2.",
    );
  });

  it("rejects a temperature above the range", () => {
    expect(modelParamsError({ temperature: "2.5" })).toBe(
      "Temperature harus angka antara 0 dan 2.",
    );
  });
});

describe("toModelParams", () => {
  it("returns null when nothing is filled in, so the server stores NULL", () => {
    expect(toModelParams({})).toBeNull();
  });

  it("sends the temperature as a number", () => {
    expect(toModelParams({ temperature: "0.3" })).toEqual({ temperature: 0.3 });
  });

  it("sends the effort as the value the server knows", () => {
    expect(toModelParams({ effort: "medium" })).toEqual({ effort: "medium" });
  });

  it("sends a toggle that was turned on", () => {
    expect(toModelParams({ thinking: "on" })).toEqual({ thinking: true });
  });

  it("sends a toggle that was turned off, so the provider default is overridden", () => {
    expect(toModelParams({ thinking: "off" })).toEqual({ thinking: false });
  });

  it("drops a toggle left on the provider default", () => {
    expect(toModelParams({ thinking: "", web_search: "" })).toBeNull();
  });
  it("drops a field the admin left blank", () => {
    expect(toModelParams({ temperature: "   ", effort: "" })).toBeNull();
  });
});

describe("fromModelParams", () => {
  it("returns no values when the product has none", () => {
    expect(fromModelParams(null)).toEqual({});
  });

  it("reads the temperature back as text for the input", () => {
    expect(fromModelParams({ temperature: 0.3 })).toEqual({ temperature: "0.3" });
  });

  it("reads the toggles back as on and off", () => {
    expect(
      fromModelParams({ effort: "high", thinking: true, web_search: false }),
    ).toEqual({ effort: "high", thinking: "on", web_search: "off" });
  });
  it("ignores a parameter the server left null", () => {
    expect(fromModelParams({ temperature: null, effort: null })).toEqual({});
  });
});