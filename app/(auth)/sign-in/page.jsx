'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <SignIn 
        routing="hash"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            formButtonPrimary: 'bg-pink-600 hover:bg-pink-700 text-sm normal-case',
            card: 'shadow-xl',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-gray-600',
            socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50',
            formFieldLabel: 'font-semibold text-gray-900',
            footer: 'hidden',
            avatarBox: 'bg-pink-100',
            userButtonPopoverFooter: 'hidden'
          }
        }}
      />
    </div>
  )
}