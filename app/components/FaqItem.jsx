'use client'

import { useState } from 'react'
import useScrollReveal from '@/app/hooks/useScrollReveal'

export default function FaqItem({ question, answer, delay = 0 }) {
  const [open, setOpen] = useState(false)
  const [ref, isVisible] = useScrollReveal()

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-left"
      >
        <span className="font-medium text-gray-900 text-sm pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-6 py-4 text-sm text-gray-500 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}
