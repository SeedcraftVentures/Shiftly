'use client'

// Public, auth-free demo of rota GENERATION, used to record the features-page clip:
// an empty week, hit Generate, and the real builder grid fills in across both teams.
// Local state only — the fill-in is staggered day-by-day for a satisfying "building"
// feel; no solver call, no persistence.
import { useState, useRef, useCallback } from 'react'
import { RefinedRotaGrid } from '@/app/(auth)/dashboard/generate/page'
import { Button } from '@/app/components/ui/kit'
import { WEEK_START, TEAMS, STAFF, SHIFTS, SEED } from '../demoData'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

export default function DemoGenerate() {
  const [assignments, setAssignments] = useState([])
  const [phase, setPhase] = useState('idle') // idle | building | done
  const [prog, setProg] = useState(0)
  const dragRef = useRef(null)

  const generate = useCallback(() => {
    if (phase === 'building') return
    setAssignments([])
    setProg(0)
    setPhase('building')
    requestAnimationFrame(() => requestAnimationFrame(() => setProg(100))) // kick the progress transition
    setTimeout(() => {
      setPhase('done')
      // reveal day-by-day, left to right, so the week visibly fills in
      DAYS.forEach((d, i) => {
        setTimeout(() => setAssignments((prev) => [...prev, ...SEED.filter((a) => a.day === d)]), i * 120)
      })
    }, 1050)
  }, [phase])

  return (
    <div style={{ minHeight: '100vh', background: '#F6F7F9', padding: '40px 32px', fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 4px rgba(0,0,0,.05), 0 14px 34px -10px rgba(0,0,0,.12)', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.02em' }}>Week 1</div>
            <div style={{ fontSize: 13, color: '#86868B', marginTop: 3 }}>12 Oct to 18 Oct · Front of House and Kitchen</div>
          </div>
          <Button onClick={generate} disabled={phase === 'building'}>
            {phase === 'building' ? 'Building your rota…' : phase === 'done' ? 'Regenerate' : 'Generate the rota'}
          </Button>
        </div>

        {/* working bar: fills while the (pretend) solver runs */}
        <div style={{ height: 3, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20, opacity: phase === 'idle' ? 0 : 1, transition: 'opacity .25s' }}>
          <div style={{ height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg, #FF1F7D99, #FF1F7D)', borderRadius: 999, transition: 'width 1.05s cubic-bezier(.4,0,.2,1)' }} />
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
