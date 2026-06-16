import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, getLocaleFromRegion, t, formatCurrency, formatDate, formatTime, isRTL } from "@/lib/i18n";
import { useTenant } from "./use-tenant";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  isRTL: boolean;
  direction: "ltr" | "rtl";
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const [locale, setLocale] = useState<Locale>("en-GB");

  useEffect(() => {
    if (tenant?.region) {
      const regionLocale = getLocaleFromRegion(tenant.region);
      setLocale(regionLocale);
    }
  }, [tenant]);

  useEffect(() => {
    // Apply RTL/LTR direction to document
    const direction = isRTL(locale) ? "rtl" : "ltr";
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
  }, [locale]);

  const contextValue: LocaleContextType = {
    locale,
    setLocale,
    t: (key: string) => t(key, locale),
    formatCurrency: (amount: number) => formatCurrency(amount, locale),
    formatDate: (date: Date) => formatDate(date, locale),
    formatTime: (date: Date) => formatTime(date, locale),
    isRTL: isRTL(locale),
    direction: isRTL(locale) ? "rtl" : "ltr"
  };

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}