export const CURRENCY_DATA = [
  { code: "INR", symbol: "₹" }, { code: "USD", symbol: "$" }, { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" }, { code: "JPY", symbol: "¥" }, { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" }, { code: "CHF", symbol: "Fr" }, { code: "CNY", symbol: "¥" },
  { code: "SGD", symbol: "S$" }, { code: "HKD", symbol: "HK$" }, { code: "NZD", symbol: "NZ$" },
  { code: "AED", symbol: "د.إ" }, { code: "SAR", symbol: "﷼" }, { code: "KRW", symbol: "₩" },
  { code: "RUB", symbol: "₽" }, { code: "ZAR", symbol: "R" }, { code: "BRL", symbol: "R$" },
  { code: "TRY", symbol: "₺" }, { code: "SEK", symbol: "kr" }, { code: "NOK", symbol: "kr" },
  { code: "DKK", symbol: "kr" }, { code: "PLN", symbol: "zł" }, { code: "THB", symbol: "฿" },
  { code: "IDR", symbol: "Rp" }, { code: "MYR", symbol: "RM" }, { code: "PHP", symbol: "₱" },
  { code: "VND", symbol: "₫" }, { code: "MXN", symbol: "$" }
];

export const getCurrencySymbol = (code) => {
  return CURRENCY_DATA.find(c => c.code === code)?.symbol || '₹';
};
