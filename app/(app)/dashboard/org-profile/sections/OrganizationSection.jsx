'use client'

import { useState } from 'react'
import { Section, FieldRow, TextField, SelectableCard } from '@/app/components/ui'
import { INDUSTRIES } from '@/app/lib/constants'
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

export default function OrganizationSection({ organization, onSave }) {
  const [name, setName] = useState(organization.organization_name || '')

  return (
    <Section
      title="Organization"
      description="Your business name and industry"
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
              onClick={() => onSave({ industry: ind.value })}
              icon={INDUSTRY_ICONS[ind.value]}
              label={ind.label}
              style={{ flex: 1, padding: '14px 10px' }}
            />
          ))}
        </div>
      </FieldRow>
    </Section>
  )
}