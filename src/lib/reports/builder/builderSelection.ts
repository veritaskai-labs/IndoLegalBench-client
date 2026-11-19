import type { PickableSession } from "./builderTypes";

export type SelectionProblem = "NEED_AT_LEAST_TWO_PRODUCTS";

export function toggleSession(
  picked: readonly PickableSession[],
  session: PickableSession,
): PickableSession[] {
  void session;
  return [...picked];
}

export function selectionProblems(picked: readonly PickableSession[]): SelectionProblem[] {
  void picked;
  return [];
}
