import { DEFAULT_CURRENCY, getCurrencyPrefix } from '@/app/lib/constants'

/**
 * Effective currency for a location: location override → org default → app default.
 */
export function effectiveCurrency(location, organization) {
  return location?.currency || organization?.currency || DEFAULT_CURRENCY
}

/**
 * Effective currency prefix for a location.
 */
export function effectiveCurrencyPrefix(location, organization) {
  return getCurrencyPrefix(effectiveCurrency(location, organization))
}