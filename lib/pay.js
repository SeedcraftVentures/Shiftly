// ════════════════════════════════════════════════════════════════════════════
//  PAY — single source of truth for turning a staff member's pay basis + hours
//  worked into money. Imported by payroll AND reporting so they always agree.
// ════════════════════════════════════════════════════════════════════════════

export const WEEKS_PER_YEAR = 52

const num = (x) => Number(x) || 0
export const basisOf = (s) => s?.pay_basis || 'hourly'
export const basisLabel = (b) => ({ hourly: 'Hourly', salary: 'Salary', annualised: 'Annualised' }[b || 'hourly'] || 'Hourly')

// Reduce any pay basis to an effective £/hour, for cost-per-hour analysis.
//  hourly     → the rate itself
//  salary     → annual salary ÷ (contracted hours/week × 52)
//  annualised → annual salary ÷ annualised hours/year
export function effectiveHourlyRate(s) {
  const basis = basisOf(s)
  if (basis === 'salary') { const annualH = num(s.contracted_hours) * WEEKS_PER_YEAR; return annualH ? num(s.annual_salary) / annualH : 0 }
  if (basis === 'annualised') { return num(s.annualised_hours) ? num(s.annual_salary) / num(s.annualised_hours) : 0 }
  return num(s.hourly_rate ?? s.wage)
}

// Gross cost for a period.
//  hourly            → hours worked × rate (varies with the rota)
//  salary/annualised → fixed: annual salary ÷ 52 × weeks (independent of hours)
export function periodCost(s, hoursWorked, weeks = 1) {
  if (basisOf(s) === 'hourly') return num(hoursWorked) * num(s.hourly_rate ?? s.wage)
  return num(s.annual_salary) / WEEKS_PER_YEAR * weeks
}

export const CURRENCY_SYMBOL = { GBP: '£', USD: '$', EUR: '€' }
export const fmtMoney = (n, symbol = '£', dp = 2) => `${symbol}${num(n).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`
