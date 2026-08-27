import { redirect } from 'next/navigation'

// The waitlist is retired now that sign-up is open. Any inbound /waitlist link
// (old emails, bookmarks) lands on the free-trial sign-up instead.
// NOTE: requires the Clerk instance to have waitlist mode OFF (open sign-up),
// otherwise Clerk sends /sign-up back to /waitlist and this loops.
export default function WaitlistPage() {
  redirect('/sign-up')
}
