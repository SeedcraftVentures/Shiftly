import { ClerkProvider } from '@clerk/nextjs'
import ReactQueryProvider from '../wrappers/ReactQueryProvider'

export default function AuthLayout({ children }) {
  return (
    <ClerkProvider>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
    </ClerkProvider>
  )
}