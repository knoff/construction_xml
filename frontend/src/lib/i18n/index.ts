import React from "react";

export type TranslationDictionary = Record<string, string>;

interface I18nContextValue {
  locale: string;
  t(key: string, fallback?: string): string;
  dictionary: TranslationDictionary;
}

const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

export interface I18nProviderProps {
  locale: string;
  dictionary: TranslationDictionary;
  children: React.ReactNode;
}

export function I18nProvider({ locale, dictionary, children }: I18nProviderProps) {
  const translate = React.useCallback(
    (key: string, fallback?: string) => {
      if (dictionary[key]) return dictionary[key];
      return fallback ?? key;
    },
    [dictionary],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      dictionary,
      t: translate,
    }),
    [dictionary, locale, translate],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const context = React.useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n должен использоваться внутри I18nProvider");
  }

  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}
