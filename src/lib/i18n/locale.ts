/**
 * Catalog lookup for the case, review, product and measurement screens (SCRUM-357).
 *
 * The codes are "id" and "en" only. How the chosen language arrives (the
 * switch, GET /me, PATCH /me/language) is SCRUM-356 and is not known yet, so
 * screens read the mock in localeMock.ts. This file does not call the server
 * and does not render a switch. The generated MeResponse type is left alone
 * until that server change is merged.
 */

export const LOCALES = ["id", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Indonesian, matching the copy on screen today. Not the PBI-26 default. */
export const DEFAULT_LOCALE: Locale = "id";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** The copy for `locale`. An author's sentence is never a key, so it cannot be rewritten here. */
export function text<T>(copy: Record<Locale, T>, locale: Locale = DEFAULT_LOCALE): T {
  return copy[locale];
}

type MessageTree = string | readonly MessageTree[] | { readonly [key: string]: MessageTree };

/**
 * Both languages, checked against one shape. A missing or extra English key
 * fails `tsc` instead of shipping a blank label.
 */
export function messages<T extends MessageTree>(copy: Record<Locale, T>): Record<Locale, T> {
  return copy;
}

/** Replace `{name}` placeholders. Values are data, not translated again. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
