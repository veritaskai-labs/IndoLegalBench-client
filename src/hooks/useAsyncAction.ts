"use client";

export function useAsyncAction<T>(
  action: () => Promise<T>,
  onDone: (result: T) => void,
  toMessage: (error: unknown) => string,
) {
  void action;
  void onDone;
  void toMessage;
  return { run: async () => {}, pending: false, error: null as string | null };
}
