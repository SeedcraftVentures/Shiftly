'use client'

// On-brand static mock of the AI companion, hand-built to match the site's other
// inline mock cards (Inbox, Availability). No screenshot dependency. Shows the
// manager asking in plain English, the companion acting, and the human-confirmed
// Publish step. Keep copy free of en/em dashes (house style).
export default function CompanionChatMock() {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v3M5 8l2 2M19 8l-2 2" />
              <rect x="5" y="10" width="14" height="9" rx="2.5" />
              <circle cx="9.5" cy="14.5" r="1" fill="white" stroke="none" />
              <circle cx="14.5" cy="14.5" r="1" fill="white" stroke="none" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Shiftly companion</p>
            <p className="text-xs text-gray-400 leading-tight">Included on the £59 plan</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-pink-50 text-pink-600 rounded-full text-[11px] font-semibold">AI on</span>
      </div>

      {/* conversation */}
      <div className="px-5 py-5 space-y-3 bg-gray-50/60">
        {/* manager */}
        <div className="flex justify-end">
          <div className="max-w-[80%] px-4 py-2.5 bg-gray-900 text-white rounded-2xl rounded-br-md text-sm leading-relaxed">
            We&apos;re short on Friday night. Can you sort it?
          </div>
        </div>

        {/* companion */}
        <div className="flex justify-start">
          <div className="max-w-[85%] px-4 py-2.5 bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md text-sm leading-relaxed shadow-sm">
            I can add a close shift and move Liam over to cover. Want me to run the scheduler?
          </div>
        </div>

        {/* action chip */}
        <div className="flex justify-start">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-pink-200 rounded-full text-xs font-semibold text-gray-900 shadow-sm">
            <span className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Ran the scheduler
            <span className="text-gray-400 font-medium">0 rule breaks, all hours met</span>
          </div>
        </div>
      </div>

      {/* publish bar (human-confirmed) */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 leading-snug">You approve before anything goes live.</p>
        <span className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-semibold whitespace-nowrap">Publish</span>
      </div>
    </div>
  )
}
