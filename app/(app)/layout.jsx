import { ClerkProvider } from '@clerk/nextjs'
import ReactQueryProvider from '../wrappers/ReactQueryProvider'

export default function AppLayout({ children }) {
  return (
    <ClerkProvider>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
    </ClerkProvider>
  )
}
