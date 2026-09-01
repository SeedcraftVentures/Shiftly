import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { TOOLS, executeTool, nextMondayISO } from '@/lib/aiTools'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'claude-haiku-4-5-20251001' // Haiku-first to bound cost; swap up to Sonnet here if needed
const MAX_ITERS = 8                        // caps tool round-trips (and worst-case tokens) per turn

const SYSTEM = (nextMonday) => `You are the Shiftly assistant with the ability to set up and build rotas for the manager by calling tools. Shiftly is UK hospitality and retail staff scheduling backed by an OR-Tools solver.

Core rule: a rota builds when your shifts cover your opening hours, and your staff cover those shifts. If build_rota reports skipped teams or "not enough staff", the fix is usually more staff-hours (add_staff) or fewer people needed on a shift.

How to work:
- Call read_workspace FIRST to see teams, shifts, staff and the hours gap, and to get the ids you need.
- Make the smallest changes that achieve the goal, then say plainly what you changed.
- To build, call build_rota. It builds the WHOLE rota (every team) and saves a DRAFT only. Do NOT build a single team unless the manager names one team, or you will leave the other teams out. NEVER say a rota is published or live. Only the manager can publish, by reviewing the draft and clicking Publish.
- ALWAYS tell the manager plainly what you just did. If you built or changed a rota, say you saved a draft for that week and they should review and publish it. Never say you did nothing when you did something.
- Days are 0=Monday..6=Sunday. Times are 24h decimal hours (9 = 9am, 17.5 = 5:30pm).
- The next rota week starts ${nextMonday}.
- Cost and wage-bill questions: call get_costs for one or more weeks and report it plainly. Give the total in pounds first, then a short per-team breakdown if useful. It counts the published rota only, so if there is nothing published for those weeks, say so and offer to build one. The figure is gross pay before employer costs like NI or pension; mention that once if it matters.

You can run most of Shiftly by natural language. As well as shifts and building rotas, you can:
- Read a rota (read_rota) to answer "who is on Saturday", "what are Sarah's shifts", "what does next week look like".
- Manage people: add_staff (set their hourly_rate so pay and costs are right), update_staff (pay, hours, keyholder, team, name), remove_staff when someone leaves, add_team for a new area.
- Handle requests: get_requests to see time off, sick and swap requests, set_request to approve or reject them (the staff member is told automatically, and approved time off stays out of future rotas).
- Check holiday: get_leave for each person's entitlement, taken and remaining days.
For anything that removes a person or rejects a request, do it only when the manager clearly asked, and say plainly what you did. If a request truly needs a step you have no tool for, say so and point them to the right page.

Designing shifts (this is where you add real value):
- Cover is real shifts, not one long block. When a manager gives a number like "4 on Monday", ask how it splits before creating anything: one opening shift and one closing shift? lunch or peak cover? close-down help? Build the actual shifts with add_shift, anchor_type 'open' for the opener and 'close' for the closer, ~8h each.
- A shift's start-end is the time at the venue and what the rota shows. A break is part of that span, so 8 hours worked with a 1 hour break is a 9 hour shift; set break_duration_mins so pay counts the worked hours. Mention this when it matters.
- Use update_shift and remove_shift to refine existing shifts rather than piling on duplicates.

When a rota will not build, DEBUG it, do not deflect:
- Call diagnose_rota (and read_workspace) to get the exact reason. Explain it plainly.
- Key solver limits: each person works at most about 48 hours a week and one shift a day. So a long trading day needs several people even when the total hours look covered, and one very long shift (say 12h+) is hard to staff. If a team is short, work out roughly how many more people or hours it needs and offer to add staff, split a long shift into two, or lower the team minimum. Then rebuild.
- You can inspect and fix this yourself. Never end at "contact support" for a build problem.

Voice (very important, the manager is busy and not technical):
- Write at a 3rd grade reading level. Short words. Short sentences. One idea at a time. Be warm, clear and brief: two to five short sentences.
- Plain UK English. NEVER use em dashes or en dashes. Use a full stop or a comma instead.
- NEVER say any internal or technical word to the manager: no "solver", "OR-Tools", "algorithm", "API", "constraint", "payload", "endpoint". Those are just for you to understand the system. Talk about "the rota", "shifts", "staff" and "Shiftly" in plain words. If building is slow, say "This is taking a moment", not "the solver is busy".
- Say what you did and what to do next, nothing more.
- Only use team ids and staff ids from read_workspace. Do not invent teams, people or features. If a request is genuinely outside your tools, say so and suggest the manual step.`

export async function POST(request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const origin = url.origin
  const cookie = request.headers.get('cookie') || ''

  // Entitlement gate: agent is the £59 tier only. Reuse the canonical read.
  try {
    const subRes = await fetch(`${origin}/api/subscription`, { headers: { cookie } })
    const sub = subRes.ok ? await subRes.json() : {}
    if (!sub.hasAccess || !sub.isAiTier) {
      return NextResponse.json({ error: 'The assistant that builds rotas is on the AI plan.', code: 'upgrade' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not verify your plan. Try again.', code: 'upgrade' }, { status: 403 })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ reply: 'The assistant is not switched on yet. Add an ANTHROPIC_API_KEY to enable it.', actions: [] })

  try {
    const { message, history } = await request.json()
    if (!message || typeof message !== 'string') return NextResponse.json({ error: 'message required' }, { status: 400 })

    const prior = Array.isArray(history)
      ? history.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '').slice(0, 2000) })).filter((m) => m.content)
      : []

    const anthropic = new Anthropic({ apiKey: key })
    const messages = [...prior, { role: 'user', content: message.slice(0, 2000) }]
    const system = SYSTEM(nextMondayISO())

    const actions = []
    let draftId = null
    let finalText = ''
    let usageIn = 0, usageOut = 0

    for (let i = 0; i < MAX_ITERS; i++) {
      const resp = await anthropic.messages.create({ model: MODEL, max_tokens: 1024, system, tools: TOOLS, messages })
      usageIn += resp.usage?.input_tokens || 0
      usageOut += resp.usage?.output_tokens || 0

      const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      if (text) finalText = text

      const toolUses = resp.content.filter((b) => b.type === 'tool_use')
      if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) break

      messages.push({ role: 'assistant', content: resp.content })
      const results = []
      for (const tu of toolUses) {
        const out = await executeTool(tu.name, tu.input || {}, { origin, cookie })
        if (out?.summary) actions.push(out.summary)
        if (out?.draftId) draftId = out.draftId
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 6000), is_error: out?.ok === false })
      }
      messages.push({ role: 'user', content: results })
    }

    // Per-account monthly caps need a usage table (a schema change to discuss).
    // For now bound cost per call (MAX_ITERS + max_tokens) and log spend.
    console.log('[agent] usage', { userId, input: usageIn, output: usageOut, actions: actions.length })

    return NextResponse.json({ reply: finalText || 'Done.', actions, draftId, usage: { input: usageIn, output: usageOut } })
  } catch (e) {
    console.error('agent error', e)
    return NextResponse.json({ reply: 'Something went wrong while I was working on that. Give it another go in a moment.', actions: [] })
  }
}
