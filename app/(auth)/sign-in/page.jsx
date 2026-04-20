'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <SignIn 
        routing="hash"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            formButtonPrimary: 'bg-shiftly-pink hover:bg-shiftly-pink-dark text-sm normal-case border-none shadow-none',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-gray-600',
            socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50',
            formFieldLabel: 'font-semibold text-gray-900',
            footerActionLink: 'text-shiftly-pink hover:text-shiftly-pink-dark',
          }
        }}
      />
    </div>
  )
}