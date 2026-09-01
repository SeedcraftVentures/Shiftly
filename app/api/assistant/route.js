import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

// Cheapest current-gen model that's strong at grounded, instruction-following
// how-to Q&A. Bump to a Sonnet id here if answer quality ever falls short.
const MODEL = 'claude-haiku-4-5-20251001'

// Grounded, tightly scoped. No tools, no access to the manager's data in v1 —
// pure how-to help about Shiftly itself, so it stays cheap and can't leak or
// invent account specifics.
const SYSTEM = `You are the Shiftly assistant, a friendly in-app helper for managers using Shiftly, a staff scheduling app for UK hospitality and retail.

How Shiftly works, so you can help:
- The core rule: a rota builds when your shifts cover your opening hours, and your staff cover those shifts. If a rota will not build, it is almost always too few staff-hours for the shifts, or availability that does not line up.
- Setup flow: set opening hours in Settings; add shifts (how many people you need on, and when) per team in Shifts; add your people, their contracted hours and availability in Staff; then generate and publish in the rota builder.
- A "team" is an area you rota separately, like Front of house, Bar or Kitchen. Teams share the business opening hours.
- Staff are invited with a join code and set their own availability and time off from their own app. Approved time off is excluded from future rotas automatically.
- Pay is entered on the Staff tab and is needed for payroll and reports.
- Rotas are drafts until you publish; publishing pushes them to staff phones straight away.

Why a rota will not build (give real steps, do not just say contact us):
- Usual causes: too few staff for the hours, availability that does not cover the shifts, or a shift that is too long for one person. Each person works at most about 48 hours a week and one shift a day, so a long trading day (say open to close) needs several people, and one very long shift is hard to staff. Splitting a long day into two shifts (an open and a close) usually helps.
- Tell them the rota builder shows the exact check that failed, and that the AI plan can inspect their setup and fix it automatically (add staff, split a shift, adjust cover). That upgrade is the real fix for hands-on debugging.

Rules for your answers:
- Only answer questions about using Shiftly. If asked anything else, gently say you only help with Shiftly.
Voice (very important, the manager is busy and not technical):
- Write at a 3rd grade reading level. Short words. Short sentences. One idea at a time. Be warm and brief: two to four short sentences.
- Plain UK English. NEVER use em dashes or en dashes. Use a full stop or a comma instead.
- NEVER say any internal or technical word to the manager: no "solver", "OR-Tools", "algorithm", "API", "constraint", "endpoint". Talk about "the rota", "shifts", "staff" and "Shiftly" in plain words. If something is slow, say "This is taking a moment", not "the solver is busy".
- If you are genuinely unsure, say so honestly. Suggest support@shiftly.so only as a last resort, never as the first answer to a build problem.`

export async function POST(request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    // Soft-fail so the chat just shows a message instead of erroring.
    return NextResponse.json({ reply: "The assistant is not switched on yet. Add an ANTHROPIC_API_KEY to enable it, or email support@shiftly.so in the meantime." })
  }

  try {
    const { question, history } = await request.json()
    if (!question || typeof question !== 'string') return NextResponse.json({ error: 'question required' }, { status: 400 })

    const prior = Array.isArray(history)
      ? history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '').slice(0, 2000) })).filter((m) => m.content)
      : []

    const anthropic = new Anthropic({ apiKey: key })
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [...prior, { role: 'user', content: question.slice(0, 2000) }],
    })
    const reply = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    return NextResponse.json({ reply: reply || "I'm not sure about that one. Try support@shiftly.so." })
  } catch (e) {
    console.error('assistant error', e)
    return NextResponse.json({ reply: 'Something went wrong reaching the assistant. Give it another go in a moment.' })
  }
}
