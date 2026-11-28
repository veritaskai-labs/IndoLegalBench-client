/**
 * Locale lookup for the case, review, product and measurement screens (SCRUM-357).
 *
 * The codes are the account field from SCRUM-354: GET /me `language` and
 * PATCH /me/language accept only "en" and "id". SCRUM-356 will read that
 * field on load, pass it to LocaleProvider, and write a change with the PATCH.
 * This module does not call either endpoint and does not render a switch.
 *
 * The server default is "en". The screen stays Indonesian until that provider
 * is mounted, so the copy already on screen does not flip, and the generated
 * MeResponse type is left alone until server PR #177 is merged.
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
