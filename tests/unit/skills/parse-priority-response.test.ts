import { describe, it, expect } from "vitest";
import { parsePriorityResponse } from "@/lib/skills/ai/parse-priority-response";

describe("parsePriorityResponse — valid values", () => {
  it('"high" → "high"', () => {
    expect(parsePriorityResponse("high")).toBe("high");
  });

  it('"HIGH" → "high" (case-normalised)', () => {
    expect(parsePriorityResponse("HIGH")).toBe("high");
  });

  it('"  high  " → "high" (whitespace trimmed)', () => {
    expect(parsePriorityResponse("  high  ")).toBe("high");
  });

  it('"normal" → "normal"', () => {
    expect(parsePriorityResponse("normal")).toBe("normal");
  });

  it('"NORMAL" → "normal"', () => {
    expect(parsePriorityResponse("NORMAL")).toBe("normal");
  });

  it('"low" → "low"', () => {
    expect(parsePriorityResponse("low")).toBe("low");
  });

  it('"Low\\n" → "low" (trailing newline stripped)', () => {
    expect(parsePriorityResponse("Low\n")).toBe("low");
  });
});

describe("parsePriorityResponse — safe defaults for unexpected values", () => {
  it('"urgent" → "normal" (not a valid priority token)', () => {
    expect(parsePriorityResponse("urgent")).toBe("normal");
  });

  it('"" → "normal" (empty string)', () => {
    expect(parsePriorityResponse("")).toBe("normal");
  });

  it('"Sorry, I can\'t classify this email." → "normal" (model refusal)', () => {
    expect(parsePriorityResponse("Sorry, I can't classify this email.")).toBe("normal");
  });

  it('"medium" → "normal" (plausible but unsupported value)', () => {
    expect(parsePriorityResponse("medium")).toBe("normal");
  });

  it('"{"priority":"high"}" → "normal" (model returned JSON instead of a word)', () => {
    expect(parsePriorityResponse('{"priority":"high"}')).toBe("normal");
  });

  it('"null" → "normal" (literal string null)', () => {
    expect(parsePriorityResponse("null")).toBe("normal");
  });

  it("never throws regardless of input", () => {
    const inputs = ["", "null", "undefined", "NaN", "0", "true", "HIGH\nNormal\nlow"];
    for (const input of inputs) {
      expect(() => parsePriorityResponse(input)).not.toThrow();
    }
  });
});

describe("parsePriorityResponse — test environment guard", () => {
  it("NODE_ENV is 'test' during vitest runs (verifies the stderr guard is active)", () => {
    // The implementation skips process.stderr.write when NODE_ENV === 'test'.
    // This test confirms vitest sets the right environment so tests stay silent.
    expect(process.env.NODE_ENV).toBe("test");
  });
});
