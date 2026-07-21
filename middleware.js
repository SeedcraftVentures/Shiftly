import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/features',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/waitlist(.*)',
  '/try-me(.*)',
  '/jobs(.*)',
  '/privacy',
  '/terms',
  '/invite/(.*)',
  '/api/stripe/webhook',
  '/api/clerk/webhook',
  '/api/subscription',
  '/api/staff/invite',
  '/employee(.*)',
])

const isCheckoutRoute = createRouteMatcher(['/checkout(.*)'])
const isApiRoute = createRouteMatcher(['/api/(.*)'])

// The board is public, but posting is account gated: it is how a posting venue
// becomes a known lead. '/jobs(.*)' above would otherwise make these public too,
// so they are matched first and fall through to the signed-in check.
// NOTE: API routes skip this middleware entirely, so /api/jobs/post does its own
// auth() check rather than relying on anything here.
const isProtectedJobsRoute = createRouteMatcher(['/jobs/post(.*)', '/jobs/manage(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // Allow all API routes through
  if (isApiRoute(request)) {
    return NextResponse.next()
  }

  // Allow public routes
  if (isPublicRoute(request) && !isProtectedJobsRoute(request)) {
    return NextResponse.next()
  }
  
  const { userId } = await auth()
  
  // If not signed in, redirect to sign-in
  if (!userId) {
    const signInUrl = new URL('/sign-in', request.url)
    return NextResponse.redirect(signInUrl)
  }
  
  // Allow checkout page
  if (isCheckoutRoute(request)) {
    return NextResponse.next()
  }
  
  // For all other protected routes, check subscription
  // We'll do this check on the client side instead to avoid loops
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}