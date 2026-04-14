export const CURRENCIES = [
  { code: 'GBP', symbol: '\u00A3', defaultMinWage: 12.71 },
  { code: 'USD', symbol: '$', defaultMinWage: 7.25 },
  { code: 'EUR', symbol: '\u20AC', defaultMinWage: 12.0 },
].map(c => ({
  ...c,
  label: `${c.code} (${c.symbol})`,
}))


export function getCurrencySymbol(currency) {
  const found = CURRENCIES.find(c => c.code === currency)
  if (found) return found.symbol

  const fallback = CURRENCIES.find(c => c.code === DEFAULT_CURRENCY)
  return fallback?.symbol || ''
}