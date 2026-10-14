'use client'

// Public, auth-free animated demo of the AI companion chat, for the features-page clip.
// Mirrors components/CompanionChatMock.jsx chrome exactly, but plays the conversation:
// the manager types a request, the companion acts, runs the scheduler, and the
// human-confirmed Publish step lights up. No API, scripted response. House style: no dashes.
import { useState, useRef, useCallback } from 'react'

const BotIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3M5 8l2 2M19 8l-2 2" />
    <rect x="5" y="10" width="14" height="9" rx="2.5" />
    <circle cx="9.5" cy="14.5" r="1" fill="white" stroke="none" />
    <circle cx="14.5" cy="14.5" r="1" fill="white" stroke="none" />
  </svg>
)

const BOT_REPLY = "I'll add a Friday close and move Liam onto it to cover. Running the scheduler now."

export default function DemoCompanion() {
  const [messages, setMessages] = useState([]) // { role, text, sub }
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [publishReady, setPublishReady] = useState(false)
  const [sent, setSent] = useState(false)
  const timers = useRef([])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || sent) return
    setSent(true)
    setMessages([{ role: 'user', text }])
    setInput('')
    const add = (fn, ms) => timers.current.push(setTimeout(fn, ms))
    add(() => setTyping(true), 650)
    add(() => { setTyping(false); setMessages((m) => [...m, { role: 'bot', text: BOT_REPLY }]) }, 2100)
    add(() => setTyping(true), 2900)
    add(() => { setTyping(false); setMessages((m) => [...m, { role: 'chip', text: 'Ran the scheduler', sub: '0 rule breaks, all hours met' }]) }, 4500)
    add(() => setPublishReady(true), 5100)
  }, [input, sent])

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: none } }
        .msg-in { animation: msgIn .34s cubic-bezier(.2,.7,.3,1) both }
        @keyframes dotB { 0%,80%,100% { transform: translateY(0); opacity: .35 } 40% { transform: translateY(-4px); opacity: 1 } }
        .dot { width: 6px; height: 6px; border-radius: 999px; background: #9ca3af; display: inline-block; animation: dotB 1.1s infinite }
        @keyframes pub { 0%,100% { box-shadow: 0 0 0 0 rgba(255,31,125,0) } 50% { box-shadow: 0 0 0 7px rgba(255,31,125,.20) } }
        .pub-ready { animation: pub 1.1s ease-in-out 2 }
      `}</style>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex flex-col" style={{ width: 448 }}>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0"><BotIcon /></span>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">Shiftly companion</p>
              <p className="text-xs text-gray-400 leading-tight">Included on the Companion plan</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-pink-50 text-pink-600 rounded-full text-[11px] font-semibold">On</span>
        </div>

        {/* conversation */}
        <div className="px-5 py-5 bg-gray-50/60 flex flex-col justify-end gap-3" style={{ height: 286 }}>
          {messages.map((m, i) => {
            if (m.role === 'user') return (
              <div key={i} className="flex justify-end msg-in">
                <div className="max-w-[80%] px-4 py-2.5 bg-gray-900 text-white rounded-2xl rounded-br-md text-sm leading-relaxed">{m.text}</div>
              </div>
            )
            if (m.role === 'bot') return (
              <div key={i} className="flex justify-start msg-in">
                <div className="max-w-[85%] px-4 py-2.5 bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md text-sm leading-relaxed shadow-sm">{m.text}</div>
              </div>
            )
            return (
              <div key={i} className="flex justify-start msg-in">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-pink-200 rounded-full text-xs font-semibold text-gray-900 shadow-sm">
                  <span className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="9" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  {m.text}
                  <span className="text-gray-400 font-medium">{m.sub}</span>
                </div>
              </div>
            )
          })}
          {typing && (
            <div className="flex justify-start msg-in">
              <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1.5">
                <span className="dot" style={{ animationDelay: '0s' }} />
                <span className="dot" style={{ animationDelay: '.15s' }} />
                <span className="dot" style={{ animationDelay: '.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            placeholder="Ask the companion anything…"
            className="flex-1 text-sm px-3.5 py-2.5 rounded-xl bg-gray-100 border border-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-pink-300"
          />
          <button onClick={send} aria-label="Send" className="w-10 h-10 rounded-xl bg-pink-500 hover:bg-pink-600 flex items-center justify-center flex-shrink-0">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>

        {/* publish bar (human-confirmed) */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 leading-snug">You approve before anything goes live.</p>
          <span className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${publishReady ? 'bg-pink-500 text-white pub-ready' : 'bg-pink-100 text-pink-400'}`}>Publish</span>
        </div>
      </div>
    </div>
  )
}
