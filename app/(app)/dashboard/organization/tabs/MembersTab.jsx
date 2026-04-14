'use client'

import { Section } from '@/app/components/ui'

export default function MembersTab({ isOwner }) {
  return (
    <Section
      title="Members"
      description="Invite team members and manage their access"
    >
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          background: 'var(--gray-50)',
          border: '1.5px dashed var(--gray-200)',
          borderRadius: 12,
        }}
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: 0 }}>
          Member management coming soon. You&apos;ll be able to invite team members and grant per-location access here.
        </p>
      </div>
    </Section>
  )
}