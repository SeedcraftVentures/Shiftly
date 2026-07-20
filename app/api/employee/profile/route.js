import { NextResponse } from 'next/server'

// Gated for the pilot, the employee app / Inbox isn't live yet. GET returns empty so any
// manager-side polling (notification bell, pending counts) doesn't error; writes are blocked.
// These will be rebuilt with proper org scoping for a later release.
export const dynamic = 'force-dynamic'
export const GET = () => NextResponse.json([])
const blocked = () => NextResponse.json({ error: 'Not available yet' }, { status: 403 })
export const POST = blocked
export const PUT = blocked
export const PATCH = blocked
export const DELETE = blocked
