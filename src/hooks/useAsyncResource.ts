"use client";

export type AsyncResource<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

export function useAsyncResource<T>(
  requestKey: string,
  load: () => Promise<T>,
  toMessage: (error: unknown) => string,
): AsyncResource<T> & { reload: () => void } {
  void requestKey;
  void load;
  void toMessage;
  return { status: "loading", reload: () => {} };
}
