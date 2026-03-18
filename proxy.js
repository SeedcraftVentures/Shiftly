import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/invite/(.*)',
  '/api/stripe/webhook',
  '/api/clerk/webhook',
  '/api/subscription',
  '/api/staff/invite',
  '/employee(.*)',
])

const isCheckoutRoute = createRouteMatcher(['/checkout(.*)'])
const isApiRoute = createRouteMatcher(['/api/(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // Allow all API routes through
  if (isApiRoute(request)) {
    return NextResponse.next()
  }
  
  // Allow public routes
  if (isPublicRoute(request)) {
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