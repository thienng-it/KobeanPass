export type PasswordStrengthTone = "danger" | "warning" | "success";

export interface PasswordStrengthMeter {
  activeSteps: number;
  tone: PasswordStrengthTone;
}

export function getPasswordStrengthMeter(score: number): PasswordStrengthMeter {
  const activeSteps = Math.min(4, Math.max(0, score));

  return {
    activeSteps,
    tone: activeSteps >= 3 ? "success" : activeSteps === 2 ? "warning" : "danger",
  };
}
