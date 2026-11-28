import { DEFAULT_LOCALE, type Locale } from "./locale";

/**
 * Stand-in for the language source.
 *
 * SCRUM-356 (the switch, the saved preference, and reading GET /me) is still
 * being built, and its shape is not known. Screens read this mock. It stays
 * Indonesian. A test may move it with setMockLocale. This file does not call
 * the server. Delete it when that language source has a real API.
 */

let current: Locale = DEFAULT_LOCALE;

export function mockLocale(): Locale {
  return current;
}

export function setMockLocale(locale: Locale): void {
  current = locale;
}

export function resetMockLocale(): void {
  current = DEFAULT_LOCALE;
}
