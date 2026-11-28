"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { DEFAULT_LOCALE, text, type Locale } from "./locale";
import { mockLocale, setMockLocale } from "./localeMock";

const LocaleContext = createContext<Locale | null>(null);

/**
 * Test stand-in that pins the language mock for the tree under it.
 * Production does not mount this. SCRUM-356's real source will replace the mock.
 */
export function LocaleProvider({
  locale,
  children,
}: Readonly<{ locale: Locale; children: ReactNode }>) {
  const prior = useRef<Locale | null>(null);
  if (prior.current === null) prior.current = mockLocale();
  setMockLocale(locale);
  useEffect(() => {
    return () => setMockLocale(prior.current ?? DEFAULT_LOCALE);
  }, []);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The mock language, or the language a test pinned on this tree. */
export function useLocale(): Locale {
  return useContext(LocaleContext) ?? mockLocale();
}

/** The catalog entry for the language on screen. */
export function useText<T>(copy: Record<Locale, T>): T {
  return text(copy, useLocale());
}
