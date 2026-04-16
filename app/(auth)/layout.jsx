import { ClerkProvider } from '@clerk/nextjs'
import ReactQueryProvider from '@/app/components/layout/ReactQueryProvider'

export default function AuthLayout({ children }) {
  return (
    <ClerkProvider>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
    </ClerkProvider>
  )
}