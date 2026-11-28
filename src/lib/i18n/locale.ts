/**
 * Locale lookup for the case, review, product and measurement screens (SCRUM-357).
 *
 * SCRUM-356 owns the language switch, the saved preference, and PBI-26 AC1's
 * English default. Until that lands, the active language stays Indonesian so
 * the screens keep the copy they already show. Both languages are in the catalogs.
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
