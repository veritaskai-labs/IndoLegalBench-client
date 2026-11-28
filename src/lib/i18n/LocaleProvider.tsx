"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, text, type Locale } from "./locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Holds the language for the screens under it. The app root does not mount this yet (SCRUM-356). */
export function LocaleProvider({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Indonesian until a provider says otherwise. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The catalog entry for the language on screen. */
export function useText<T>(copy: Record<Locale, T>): T {
  return text(copy, useLocale());
}
