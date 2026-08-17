import { describe, expect, it } from "vitest";
import { completeLoginEmail } from "./loginIdentity";

describe("normalização do login", () => {
  it.each([
    ["robin", "iracambi@iracambi.com"],
    [" ROBIN@IRACAMBI.COM ", "iracambi@iracambi.com"],
    ["deivid", "viveiro@iracambi.com"],
    [" DEIVID@IRACAMBI.COM ", "viveiro@iracambi.com"],
    ["viveiro", "viveiro@iracambi.com"],
    ["VIVEIRO@IRACAMBI.COM", "viveiro@iracambi.com"],
  ])("converte %s para a identidade correta", (login, expected) => {
    expect(completeLoginEmail(login)).toBe(expected);
  });
});
