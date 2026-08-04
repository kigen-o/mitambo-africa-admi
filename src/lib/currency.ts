export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const currencyCodes = [
  "KES",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "ZAR",
  "TZS",
  "UGX",
  "RWF",
] as const;

export type CurrencyCode = (typeof currencyCodes)[number];

export const DEFAULT_CURRENCY_CODE: CurrencyCode = "KES";

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
];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return (
    typeof value === "string" &&
    (currencyCodes as readonly string[]).includes(value)
  );
}

export function normalizeCurrencyCode(value: unknown): CurrencyCode {
  return isCurrencyCode(value) ? value : DEFAULT_CURRENCY_CODE;
}

export function currencyOptionFor(value: unknown): CurrencyOption {
  const code = normalizeCurrencyCode(value);
  return currencies.find((currency) => currency.code === code) ?? currencies[0];
}

export function formatAmountForCurrency(
  amount: number,
  currencyCode: unknown,
): string {
  const currency = currencyOptionFor(currencyCode);
  const numericAmount = Number.isFinite(amount) ? amount : 0;
  return `${currency.symbol}${numericAmount.toLocaleString("en-KE", {
    maximumFractionDigits: 2,
  })}`;
}
