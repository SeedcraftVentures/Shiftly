'use client'

import { useState } from 'react'
import { Section, FieldRow, TextField, SelectableCard } from '@/app/components/ui'
import { INDUSTRIES, CURRENCIES } from '@/app/lib/constants'
import {
  IndustryHospitalityIcon,
  IndustryRetailIcon,
  IndustryOtherIcon,
} from '@/app/lib/icons'

const INDUSTRY_ICONS = {
  Hospitality: <IndustryHospitalityIcon />,
  Retail: <IndustryRetailIcon />,
  Other: <IndustryOtherIcon />,
}

export default function OrganizationDetailsTab({ organization, onSave, isOwner }) {
  const [name, setName] = useState(organization.organization_name || '')

  return (
    <Section
      title="Organization Details"
      description="Your business name, industry, and default currency"
    >
      <FieldRow label="Organization name">
        <TextField
          value={name}
          onChange={setName}
          onBlur={() => {
            if (name.trim() && name !== organization.organization_name) {
              onSave({ organization_name: name.trim() })
            }
          }}
          size="sm"
          placeholder="Your business name"
        />
      </FieldRow>

      <FieldRow label="Industry">
        <div style={{ display: 'flex', gap: 10 }}>
          {INDUSTRIES.map(ind => (
            <SelectableCard
              key={ind.value}
              selected={organization.industry === ind.value}
              onClick={() => isOwner && onSave({ industry: ind.value })}
              icon={INDUSTRY_ICONS[ind.value]}
              label={ind.label}
              style={{ flex: 1, padding: '14px 10px' }}
            />
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Default currency" description="Locations can override this individually">
        <select
          value={organization.currency || 'GBP'}
          onChange={e => onSave({ currency: e.target.value })}
          disabled={!isOwner}
          style={{
            padding: '8px 14px',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            border: '1.5px solid var(--gray-200)',
            borderRadius: 8,
            color: 'var(--gray-800)',
            background: 'var(--gray-0)',
            outline: 'none',
            cursor: isOwner ? 'pointer' : 'not-allowed',
          }}
        >
          {CURRENCIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FieldRow>
    </Section>
  )
}