'use client'

import { INDUSTRIES } from '@/app/lib/constants'
import { StepChip, TextField, SelectableCard } from '@/app/components/ui'
import {
  BusinessIcon,
  IndustryHospitalityIcon,
  IndustryRetailIcon,
  IndustryOtherIcon,
} from '@/app/lib/icons'

const INDUSTRY_ICONS = {
  Hospitality: IndustryHospitalityIcon,
  Retail: IndustryRetailIcon,
  Other: IndustryOtherIcon,
}

export default function Step1Organization({ state, onNext }) {
  const { businessName, industry, setField } = state

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <StepChip icon={<BusinessIcon size={13} />} label="Organisation" active />

      <h1 className="heading-page">What&#39;s your business called?</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 28px' }}>
        This appears throughout your workspace.
      </p>

      <TextField
        value={businessName}
        onChange={v => setField('businessName', v)}
        onKeyDown={e => {
          if (e.key === 'Enter' && businessName.trim()) {
            /* focus moves to industry */
          }
        }}
        placeholder="e.g. The Crown, Riverside Retail..."
        autoFocus
      />

      <div style={{ marginTop: 32 }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: '0 0 16px' }}>
          What industry are you in? We&#39;ll pre-load team presets that match.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {INDUSTRIES.map(({ value, label }) => {
            const Icon = INDUSTRY_ICONS[value] || IndustryOtherIcon
            return (
              <SelectableCard
                key={value}
                selected={industry === value}
                onClick={() => setField('industry', value)}
                icon={<Icon size={24} />}
                label={label}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
