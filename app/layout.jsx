import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter, Plus_Jakarta_Sans, Figtree } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Plus Jakarta Sans is retained as a fallback for the in-app dashboard.
// Body copy across the whole site now uses Cal Sans Text (set on <body> below)
// to rhyme with the app's typography; Figtree is kept as a graceful fallback.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
})

// Figtree: shared Seedcraft calling-card body font, kept as the fallback face.
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata = {
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
      <html lang="en" className={`${inter.variable} ${jakarta.variable} ${figtree.variable}`} suppressHydrationWarning>
        <head>
          {/* Set the theme before first paint so there's no light-mode flash on load. */}
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('shiftly_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
        </head>
        <body className="font-sans antialiased" style={{ fontFamily: "'Cal Sans Text', var(--font-figtree), system-ui, sans-serif" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
