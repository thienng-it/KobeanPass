import { describe, expect, it } from "vitest";
import { getPasswordStrengthMeter } from "./passwordStrength";

describe("getPasswordStrengthMeter", () => {
  it("maps zxcvbn scores to four visible meter steps", () => {
    expect(getPasswordStrengthMeter(0)).toEqual({ activeSteps: 0, tone: "danger" });
    expect(getPasswordStrengthMeter(2)).toEqual({ activeSteps: 2, tone: "warning" });
    expect(getPasswordStrengthMeter(4)).toEqual({ activeSteps: 4, tone: "success" });
  });

  it("clamps unexpected scores to the supported range", () => {
    expect(getPasswordStrengthMeter(-1)).toEqual({ activeSteps: 0, tone: "danger" });
    expect(getPasswordStrengthMeter(8)).toEqual({ activeSteps: 4, tone: "success" });
  });
});
