// Reads the employer session cookie inside server routes and pages. Returns the
// employer_id for a valid signed session, else null. Kept apart from auth.js
// because this imports next/headers and auth.js must stay pure for tests.

import { cookies } from 'next/headers'
import { employerFromSession, SESSION_COOKIE } from './auth'

export async function currentEmployerId() {
  const store = await cookies()
  return employerFromSession(store.get(SESSION_COOKIE)?.value)
}
