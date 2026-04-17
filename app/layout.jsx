import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Inter } from 'next/font/google'
import DeleteUserButton from '@/app/components/testing/DeleteUserButton'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: 'Shiftly - Staff Scheduling Made Fair',
  description: 'Build fair, balanced rotas in minutes. Set your rules once, Shiftly handles the rest. Built for retail and hospitality managers.',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  // openGraph: {
  //   images: ['/og-image.png'],
  // },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="font-sans antialiased">
          {children}
          <DeleteUserButton />
        </body>
      </html>
    </ClerkProvider>
  )
}