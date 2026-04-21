'use client'

import { useState } from 'react'
import { inputStyle } from './styles'

export default function TextInput({ value, onBlur, placeholder, type = 'text' }) {
  const [local, setLocal] = useState(value)

  return (
    <input
      type={type}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onBlur(local) }}
      placeholder={placeholder}
      style={inputStyle}
    />
  )
}