import { ClerkProvider } from '@clerk/nextjs'
import Providers from '../components/Providers'
import { ThemeProvider } from '../components/ui/kit'

export default function AuthLayout({ children }) {
  return (
    <ClerkProvider>
      <Providers>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </Providers>
    </ClerkProvider>
  )
}