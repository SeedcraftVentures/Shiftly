'use client'

import { useState } from 'react'
import { ChevronDownIcon, TrashIcon, KeyholderIcon } from '@/app/lib/icons'
import Field from '@/app/components/ui/Field'
import TextInput from '@/app/components/ui/TextInput'
import NumberInput from '@/app/components/ui/NumberInput'
import { selectStyle } from '@/app/components/ui/styles'

const INVITE_CONFIG = {
  'Not Invited': { text: 'Invite', bg: 'var(--shiftly-pink)', color: 'var(--gray-0)' },
  'Pending': { text: 'Invited', bg: 'var(--shiftly-pink-light)', color: 'var(--shiftly-pink)' },
  'Accepted': { text: '✓ Connected', bg: 'var(--green-100)', color: 'var(--green-600)' },
}

function Avatar({ name, color }) {
  const letter = (name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: color, color: 'var(--gray-0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 'var(--text-sm)', fontWeight: 700, flexShrink: 0,
    }}>
      {letter}
    </div>
  )
}

function InvitePill({ status }) {
  const config = INVITE_CONFIG[status] || INVITE_CONFIG['Not Invited']
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 99,
      fontSize: 'var(--text-xs)', fontWeight: 600,
      background: config.bg, color: config.color,
      whiteSpace: 'nowrap',
    }}>
      {config.text}
    </span>
  )
}

function HourStepper({ value, onBlur, label }) {
  const [local, setLocal] = useState(value)

  const step = (delta) => {
    const next = Math.max(0, local + delta)
    setLocal(next)
    onBlur(next)
  }

  return (
    <Field label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button
          onClick={() => step(-1)}
          style={{
            width: 32, height: 34, borderRadius: '7px 0 0 7px',
            border: '1.5px solid var(--gray-200)', borderRight: 'none',
            background: 'var(--gray-50)', color: 'var(--gray-500)',
            cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600,
          }}
        >
          −
        </button>
        <div style={{
          minWidth: 48, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--gray-200)',
          fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--gray-800)',
          background: 'var(--gray-0)',
        }}>
          {local}h
        </div>
        <button
          onClick={() => step(1)}
          style={{
            width: 32, height: 34, borderRadius: '0 7px 7px 0',
            border: '1.5px solid var(--gray-200)', borderLeft: 'none',
            background: 'var(--gray-50)', color: 'var(--gray-500)',
            cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600,
          }}
        >
          +
        </button>
      </div>
    </Field>
  )
}

export default function StaffRow({
  member, teams, teamColor, teamColorLight, isOpen, onToggle, onUpdate, onDelete,
}) {
  const [saving, setSaving] = useState(false)

  const persistField = async (field, value) => {
    setSaving(true)
    try {
      await onUpdate(member.staff_id, { [field]: value }, true)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `1.5px solid ${isOpen ? teamColor : 'var(--gray-200)'}`,
      background: isOpen ? teamColorLight : 'var(--gray-0)',
      overflow: 'hidden',
      transition: 'all .15s',
    }}>
      {/* Collapsed row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
        }}
      >
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: teamColor, flexShrink: 0 }} />
        <Avatar name={member.name} color={teamColor} />

        {/* Name + keyholder */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-900)' }}>
            {member.name}
          </span>
          {member.is_keyholder && (
            <span style={{
              padding: '1px 6px', borderRadius: 4,
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              background: teamColorLight, color: teamColor,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <KeyholderIcon style={{ width: 9, height: 9 }} />
              Key
            </span>
          )}
        </div>

        {/* Role */}
        <span style={{ width: 80, fontSize: 'var(--text-xs)', color: 'var(--gray-500)', textAlign: 'center' }}>
          {member.role || '–'}
        </span>

        {/* Hours */}
        <span style={{ width: 100, fontSize: 'var(--text-xs)', fontWeight: 600, textAlign: 'center' }}>
          <span style={{ color: 'var(--shiftly-pink)' }}>{member.contracted_hours}h</span>
          <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}> / {member.max_hours}h</span>
        </span>

        {/* Invite status pill */}
        <div style={{ width: 110, display: 'flex', justifyContent: 'center' }}>
          <InvitePill status={member.invite_status} />
        </div>

        {/* Chevron */}
        <ChevronDownIcon
          className="w-4 h-4"
          style={{
            color: 'var(--gray-400)', flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .15s',
          }}
        />
      </div>

      {/* Expanded edit panel */}
      {isOpen && (
        <div style={{
          borderTop: `1px solid ${teamColor}`,
          padding: '16px 18px',
          background: 'var(--gray-0)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Row 1: Name, Email, Team, Keyholder */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <Field label="Name">
              <TextInput value={member.name} onBlur={v => persistField('name', v)} />
            </Field>
            <Field label="Email">
              <TextInput
                value={member.invite_email || ''}
                placeholder="email@example.com"
                type="email"
                onBlur={v => persistField('invite_email', v || null)}
              />
            </Field>
            <Field label="Team">
              <select
                value={member.team_id}
                onChange={e => persistField('team_id', e.target.value)}
                style={selectStyle}
              >
                {teams.map(t => (
                  <option key={t.team_id} value={t.team_id}>{t.name}</option>
                ))}
              </select>
            </Field>
            <button
              onClick={() => persistField('is_keyholder', !member.is_keyholder)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                fontSize: 'var(--text-xs)', fontWeight: 600,
                border: `1.5px solid ${member.is_keyholder ? teamColor : 'var(--gray-200)'}`,
                background: member.is_keyholder ? teamColorLight : 'var(--gray-0)',
                color: member.is_keyholder ? teamColor : 'var(--gray-500)',
                cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 4,
                marginBottom: 1,
              }}
            >
              <KeyholderIcon style={{ width: 11, height: 11 }} /> Keyholder
            </button>
          </div>

          {/* Row 2: Wage, Contracted hours, Max hours, Invite status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto 1fr', gap: 12, alignItems: 'end' }}>
            <Field label="Wage (£/hr)">
              <NumberInput value={member.wage} onBlur={v => persistField('wage', v)} min={0} step={0.01} />
            </Field>
            <HourStepper
              label="Contracted hrs/wk"
              value={member.contracted_hours}
              onBlur={v => persistField('contracted_hours', v)}
            />
            <HourStepper
              label="Max hrs/wk"
              value={member.max_hours}
              onBlur={v => persistField('max_hours', v)}
            />
            <Field label="Invite status">
              <div style={{ padding: '6px 0' }}>
                <InvitePill status={member.invite_status} />
              </div>
            </Field>
          </div>

          {/* Footer: delete + saving indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <button
              onClick={e => { e.stopPropagation(); onDelete(member.staff_id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid var(--gray-200)', background: 'var(--gray-0)',
                color: 'var(--gray-400)', fontSize: 'var(--text-xs)', fontWeight: 500,
                cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--red-300)'
                e.currentTarget.style.color = 'var(--red-500)'
                e.currentTarget.style.background = 'var(--red-50)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--gray-200)'
                e.currentTarget.style.color = 'var(--gray-400)'
                e.currentTarget.style.background = 'var(--gray-0)'
              }}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete
            </button>
            {saving && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>Saving…</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}