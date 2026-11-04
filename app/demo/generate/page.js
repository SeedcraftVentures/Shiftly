'use client'

// Public, auth-free demo of rota GENERATION, used to record the features-page / one-pager clip.
// An empty week, hit Generate, and the real builder grid fills in shift by shift with a springy
// cascade (overshoot pop, left to right), a brief shimmer of anticipation, and a gentle settle at
// the end. Local state only, no solver call, no persistence. The block-pop lives here (scoped to
// this page), so the real app is untouched.
import { useState, useRef, useCallback } from 'react'
import { RefinedRotaGrid } from '@/app/(auth)/dashboard/generate/page'
import { Button } from '@/app/components/ui/kit'
import { WEEK_START, TEAMS, STAFF, SHIFTS, SEED } from '../demoData'

const STAFF_INDEX = Object.fromEntries(STAFF.map((s, i) => [s.id, i]))
// Reveal order: week left to right, top to bottom within each day, so it fills like a sweep.
const ORDER = [...SEED].sort((a, b) => (a.day - b.day) || (STAFF_INDEX[a.staff_id] - STAFF_INDEX[b.staff_id]))
const STEP = 46          // ms between each shift popping in
const ANTICIPATION = 560 // ms of shimmer before the cascade

export default function DemoGenerate() {
  const [assignments, setAssignments] = useState([])
  const [phase, setPhase] = useState('idle') // idle | building | filling | done
  const dragRef = useRef(null)
  const timers = useRef([])

  const generate = useCallback(() => {
    if (phase === 'building' || phase === 'filling') return
    timers.current.forEach(clearTimeout)
    timers.current = []
    const t = (fn, ms) => timers.current.push(setTimeout(fn, ms))

    setAssignments([])
    setPhase('building')
    t(() => {
      setPhase('filling')
      ORDER.forEach((a, i) => t(() => setAssignments((prev) => [...prev, a]), i * STEP))
    }, ANTICIPATION)
    t(() => setPhase('done'), ANTICIPATION + ORDER.length * STEP + 260)
  }, [phase])

  const working = phase === 'building' || phase === 'filling'

  return (
    <div style={{ minHeight: '100vh', background: '#F6F7F9', padding: '40px 32px', fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <style>{`
        /* springy pop for each shift as it mounts (scoped to this demo page) */
        [title="Click to edit"] { animation: blockPop .46s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes blockPop {
          0%   { opacity: 0; transform: scale(.68) translateY(7px); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .gen-card { transition: box-shadow .4s ease; }
        .gen-card.done { animation: settle .6s cubic-bezier(.34,1.4,.64,1); }
        @keyframes settle { 0%{transform:scale(1)} 42%{transform:scale(1.007)} 100%{transform:scale(1)} }
        .shim { height: 3px; border-radius: 999px; background: rgba(0,0,0,0.055); position: relative; overflow: hidden; }
        .shim::after { content: ''; position: absolute; top: 0; bottom: 0; width: 38%; border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255,31,125,.85), transparent); animation: shimmer 1.05s cubic-bezier(.5,.1,.5,.9) infinite; }
        @keyframes shimmer { 0%{transform:translateX(-130%)} 100%{transform:translateX(360%)} }
        @media (prefers-reduced-motion: reduce) {
          [title="Click to edit"], .gen-card.done, .shim::after { animation: none; }
        }
      `}</style>
      <div className={`gen-card${phase === 'done' ? ' done' : ''}`} style={{ maxWidth: 1160, margin: '0 auto', background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 4px rgba(0,0,0,.05), 0 14px 34px -10px rgba(0,0,0,.12)', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em' }}>Week 1</div>
            <div style={{ fontSize: 13, color: '#86868B', marginTop: 3 }}>12 Oct to 18 Oct · Front of House and Kitchen</div>
          </div>
          <Button onClick={generate} disabled={working}>
            {phase === 'building' ? 'Building your rota…' : phase === 'filling' ? 'Building your rota…' : phase === 'done' ? 'Regenerate' : 'Generate the rota'}
          </Button>
        </div>

        <div style={{ height: 3, marginBottom: 20, opacity: working ? 1 : 0, transition: 'opacity .25s' }}>
          {working && <div className="shim" />}
        </div>

        <RefinedRotaGrid
          large
          bare
          gridTeams={TEAMS}
          staff={STAFF}
          shifts={SHIFTS}
          assignments={assignments}
          weekStart={WEEK_START}
          weekNum={1}
          onMove={() => {}}
          onRemove={() => {}}
          onAddRequest={() => {}}
          onEditRequest={() => {}}
          dragRef={dragRef}
        />
      </div>
    </div>
  )
}
