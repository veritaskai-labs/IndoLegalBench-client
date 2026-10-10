export type VersionAction = "fork" | "history" | "compare";

export function mapVersionError(error: unknown, action: VersionAction): string {
  void error;
  void action;
  return "";
}
