import * as React from "react";

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const currencies: readonly CurrencyOption[] = [
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "RWF", symbol: "RF", name: "Rwandan Franc" },
] as const;

interface CurrencyContextType {
  currency: CurrencyOption;
  setCurrency: (currency: CurrencyOption) => void;
  formatAmount: (amount: number) => string;
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "mitambo_currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState<CurrencyOption>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.code === "string") {
          return parsed;
        }
      } catch {
        // Fallback to default
      }
    }
    return currencies[0];
  });

  const setCurrency = React.useCallback((newCurrency: CurrencyOption) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCurrency));
  }, []);

  const formatAmount = React.useCallback(
    (amount: number) => {
      return `${currency.symbol}${amount.toLocaleString()}`;
    },
    [currency.symbol]
  );

  const value = React.useMemo(
    () => ({ currency, setCurrency, formatAmount }),
    [currency, setCurrency, formatAmount]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = React.useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

