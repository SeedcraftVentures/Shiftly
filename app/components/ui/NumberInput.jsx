'use client'

import { useState } from 'react'
import { inputStyle } from './styles'

export default function NumberInput({ value, onBlur, min = 0, step = 1 }) {
  const [local, setLocal] = useState(value)

  return (
    <input
      type="number"
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(local)
        if (!isNaN(parsed) && parsed !== value) onBlur(parsed)
      }}
      min={min}
      step={step}
      style={inputStyle}
    />
  )
}