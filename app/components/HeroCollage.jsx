'use client'

import RotaGridMock from './RotaGridMock'

// Layered hero visual: the rota grid is the base, with a small companion note and
// a coverage chip floating over it for depth. Faithful mocks, not screenshots, so
// it always sizes cleanly. Floats show on larger screens; on mobile just the rota
// grid shows so nothing overlaps badly. Copy is plain and short (house style).
export default function HeroCollage() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* base: rota grid */}
      <div className="relative z-10 lg:-rotate-[1.5deg]">
        <RotaGridMock />
      </div>

      {/* floating companion note (bottom-left, larger screens) */}
      <div className="hidden lg:block absolute -bottom-12 -left-14 z-20 w-72 rotate-[2deg]">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="10" width="14" height="9" rx="2.5" /><path d="M12 3v3" /><circle cx="9.5" cy="14.5" r="1" fill="white" stroke="none" /><circle cx="14.5" cy="14.5" r="1" fill="white" stroke="none" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-gray-900">Companion</span>
          </div>
          <div className="px-3 py-2 bg-gray-900 text-white rounded-xl rounded-br-sm text-xs mb-2 ml-6">Cover Friday night?</div>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl rounded-bl-sm text-xs">Done. Liam is on. No rules broken.</div>
        </div>
      </div>

      {/* floating coverage chip (top-right) */}
      <div className="hidden sm:flex absolute -top-4 -right-3 lg:-right-8 z-20 rotate-[3deg] items-center gap-2 bg-white rounded-full border border-gray-200 shadow-xl px-4 py-2">
        <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="text-xs font-bold text-gray-900">Everyone got their hours</span>
      </div>
    </div>
  )
}
