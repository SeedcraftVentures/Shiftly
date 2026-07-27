// Stops any single employer dominating the board.
//
// Without this, one large chain with an open API (Greene King alone has ~3,000
// live UK vacancies) drowns out the independents and small multi-site groups,
// which are both the more interesting listings and Shiftly's actual customers.
//
// Round-robin rather than a hard quota, because a hard quota starves the board
// when supply is thin: capping at 10% of 100 with only one employer available
// would yield 10 listings, not 100. Round-robin self-balances, even spread when
// there's variety, graceful degradation when there isn't.

/**
 * @param {object[]} rows      normalised listings from any source(s)
 * @param {object}  [opts]
 * @param {number}  [opts.limit=Infinity]   total rows to return
 * @param {number}  [opts.maxFraction]      e.g. 0.1, soft ceiling per employer,
 *                                          relaxed if there is nothing else to fill with
 * @param {string}  [opts.key='employer_name']
 */
export function diversifyByEmployer(rows, { limit = Infinity, maxFraction, key = 'employer_name' } = {}) {
  const groups = new Map()
  for (const r of rows) {
    const k = r[key] || 'unknown'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(r)
  }

  const target = Math.min(limit, rows.length)
  const cap = maxFraction ? Math.max(1, Math.floor(target * maxFraction)) : Infinity

  const queues = [...groups.values()]
  const taken = []
  const counts = new Map()

  // Pass 1, round-robin, respecting the soft cap.
  let progressed = true
  while (taken.length < target && progressed) {
    progressed = false
    for (const q of queues) {
      if (taken.length >= target) break
      if (!q.length) continue
      const k = q[0][key] || 'unknown'
      if ((counts.get(k) || 0) >= cap) continue
      taken.push(q.shift())
      counts.set(k, (counts.get(k) || 0) + 1)
      progressed = true
    }
  }

  // Pass 2, still short because the cap bit? Fill from whatever is left. A
  // partly-lopsided board beats an empty one.
  if (taken.length < target) {
    for (const q of queues) {
      while (q.length && taken.length < target) taken.push(q.shift())
    }
  }

  return taken
}

/** Employer → count, for logging what a run actually produced. */
export function employerSpread(rows, key = 'employer_name') {
  const out = {}
  for (const r of rows) {
    const k = r[key] || 'unknown'
    out[k] = (out[k] || 0) + 1
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]))
}
