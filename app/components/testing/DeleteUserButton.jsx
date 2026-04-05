'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk, useUser } from '@clerk/nextjs'

export default function DeleteUserButton() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  if (!isLoaded || !user) {
    return null
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete your account permanently? This action cannot be undone.'
    )

    if (!confirmed) {
      return
    }

    setError('')
    setIsDeleting(true)

    try {
      await user.delete()

      // Deleting the Clerk user invalidates sessions; sign out for a clean redirect.
      await signOut({ redirectUrl: '/sign-up' })
      router.replace('/sign-up')
    } catch (err) {
      console.error('Delete user error:', err)
      setError(err?.errors?.[0]?.message || err?.message || 'Failed to delete user')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isDeleting ? 'Deleting...' : 'Delete user'}
      </button>

      {error ? (
        <div className="fixed bottom-20 right-5 z-50 max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-md">
          {error}
        </div>
      ) : null}
    </>
  )
}