export const CURRENCIES = [
  { value: 'GBP', symbol: '\u00A3', defaultMinWage: 12.71 },
  { value: 'USD', symbol: '$', defaultMinWage: 7.25 },
  { value: 'EUR', symbol: '\u20AC', defaultMinWage: 12.0 },
].map(c => ({
  ...c,
  label: `${c.value} (${c.symbol})`,
}))


export function getCurrencySymbol(currency) {
  const found = CURRENCIES.find(c => c.value === currency)
  if (found) return found.symbol

  const fallback = CURRENCIES.find(c => c.value === DEFAULT_CURRENCY)
  return fallback?.symbol || ''
}