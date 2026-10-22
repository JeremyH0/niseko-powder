/**
 * Tiny translation helper. Every UI string goes through it, even while the site
 * is English-only, so adding a language is translation work, not refactoring.
 *
 * Strings live next to the code that uses them: shared ones in `./common.ts`,
 * feature ones in `src/features/<name>/strings.ts`, both via `defineMessages`.
 */

export const LOCALES = ['en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

type Params = Record<string, string | number>;

/** English is required and complete; other locales may be partial and fall back to English. */
export type Messages<K extends string> = { en: Record<K, string> } & Partial<
  Record<Locale, Partial<Record<K, string>>>
>;

export function defineMessages<K extends string>(messages: Messages<K>): Messages<K> {
  return messages;
}

/** `{name}` placeholders are replaced from `params`; unknown placeholders are left as-is. */
export function createTranslator<K extends string>(messages: Messages<K>, locale: Locale = DEFAULT_LOCALE) {
  return (key: K, params?: Params): string => {
    // Unknown keys (e.g. a reason code from older stored data) fall back to the key, never crash.
    const template: string = messages[locale]?.[key] ?? messages.en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}
