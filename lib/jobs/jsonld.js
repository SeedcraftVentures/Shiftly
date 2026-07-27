// JobPosting structured data. Google's job crawler reads this, it is the reason
// the board can rank at all.
//
// Pure, no server imports, so it stays safe for any component and is easy to test.

import { showsPay, MAX_AGE_DAYS } from './taxonomy'

// Sources where we hold the complete advert. Aggregator feeds send a capped
// snippet, and marking up truncated content as the full description risks a
// structured data penalty, so those rows get no schema at all.
const FULL_DESCRIPTION_SOURCES = new Set(['smartrecruiters', 'reed'])

export const hasFullDescription = (job) =>
  Boolean(job?.is_native) || FULL_DESCRIPTION_SOURCES.has(job?.source)

// schema.org employmentType is a fixed vocabulary, so our taxonomy has to map
// onto it rather than emit its own strings. UK "casual" (zero hours) has no
// honest equivalent, and inventing one is worse than saying OTHER.
const EMPLOYMENT_TYPE = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  temp: 'TEMPORARY',
  seasonal: 'TEMPORARY',
  casual: 'OTHER',
}

const PAY_UNIT = { hourly: 'HOUR', annual: 'YEAR' }

/**
 * baseSalary, or null.
 *
 * Deliberately strict. Google treats a malformed MonetaryAmount worse than an
 * absent one, so this omits the field unless the employer stated the pay, the
 * period is one we recognise, and there is a real lower bound. An upper bound on
 * its own ("up to £15/hr") is fine as board copy but is not a salary figure, so
 * it is not marked up.
 */
export function baseSalary(job) {
  if (!showsPay(job)) return null
  const unitText = PAY_UNIT[job.pay_period]
  const min = Number(job.pay_min)
  if (!unitText || !(min > 0)) return null

  const max = Number(job.pay_max) > 0 ? Number(job.pay_max) : null
  return {
    '@type': 'MonetaryAmount',
    currency: 'GBP',
    value: {
      '@type': 'QuantitativeValue',
      minValue: min,
      ...(max && max !== min ? { maxValue: max } : {}),
      unitText,
    },
  }
}

/**
 * JobPosting JSON-LD for a listing, or null when the listing does not qualify.
 *
 * Returns null when:
 *   - the role has closed. Google penalises live job markup on filled roles, and
 *     expired pages stay up at 200, so this is the gate that keeps them clean.
 *   - we only hold a capped snippet rather than the employer's full advert.
 *   - required fields are missing.
 */
export function jobPostingSchema(job, { isExpired = false } = {}) {
  if (!job || isExpired) return null
  if (!hasFullDescription(job)) return null
  if (!job.title || !job.description || !job.posted_at || !job.employer_name) return null

  // We stop showing a listing at MAX_AGE_DAYS, so that is genuinely when the
  // posting stops being valid as far as this site is concerned. Honour an
  // employer-supplied expiry when we have one.
  const validThrough =
    job.expires_at || new Date(new Date(job.posted_at).getTime() + MAX_AGE_DAYS * 864e5).toISOString()

  const salary = baseSalary(job)

  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: new Date(job.posted_at).toISOString(),
    validThrough,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.brand || job.employer_name,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.locality ? { streetAddress: job.locality } : {}),
        ...(job.city ? { addressLocality: job.city } : {}),
        ...(job.region ? { addressRegion: job.region } : {}),
        ...(job.postcode ? { postalCode: job.postcode } : {}),
        addressCountry: 'GB',
      },
    },
    // Applications complete on the employer's own site, never on Shiftly.
    // Claiming otherwise is a Google policy violation.
    directApply: false,
    ...(EMPLOYMENT_TYPE[job.contract_type] ? { employmentType: EMPLOYMENT_TYPE[job.contract_type] } : {}),
    ...(salary ? { baseSalary: salary } : {}),
    ...(job.listing_id ? { identifier: { '@type': 'PropertyValue', name: 'Shiftly Jobs', value: job.listing_id } } : {}),
  }
}
