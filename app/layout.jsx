import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter, Plus_Jakarta_Sans, Figtree } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Plus Jakarta Sans is retained for the in-app dashboard (out of scope for the
// calling-card restyle). The marketing surfaces now use Figtree as the body font.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
})

// Figtree: shared Seedcraft calling-card body font.
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata = {
  // Without this, every relative Open Graph and Twitter image stays relative, so
  // nothing resolves when a page is shared. Job listing pages are the ones people
  // actually share, so they are the ones that break. Falls back to the live domain
  // rather than localhost, because the fallback is what production uses if the env
  // var is ever missing there.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://shiftly.so'),
  title: 'Shiftly - Staff Scheduling Made Fair',
  description: 'Build fair, balanced rotas in minutes. Set your rules once, Shiftly handles the rest. Built for retail and hospitality managers.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider signInUrl="/sign-in" waitlistUrl="/waitlist">
      <html lang="en" className={`${inter.variable} ${jakarta.variable} ${figtree.variable}`}>
        <body className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
