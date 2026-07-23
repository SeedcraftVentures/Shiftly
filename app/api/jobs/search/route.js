import { NextResponse } from 'next/server'
import { searchListings, getFacets } from '@/lib/jobs/query'

export const dynamic = 'force-dynamic'

// Public, no auth, the board is a marketing surface. Reads only; the ingest
// route is the sole writer and it is secret-guarded.
export async function GET(req) {
  const p = req.nextUrl.searchParams
  const filters = {
    q: p.get('q') || '',
    role: p.get('role') || '',
    venue: p.get('venue') || '',
    city: p.get('city') || '',
    contract: p.get('contract') || '',
    paid: p.get('paid') === '1',
    livingWage: p.get('lw') === '1',
    industry: p.get('industry') || '',
    page: p.get('page') || 1,
  }

  const [list, facets] = await Promise.all([searchListings(filters), getFacets(filters)])
  if (list.error) return NextResponse.json({ error: list.error }, { status: 500 })

  return NextResponse.json({ ...list, facets })
}
