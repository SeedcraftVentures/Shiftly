// ════════════════════════════════════════════════════════════════════════════
//  Agent tools for the AI companion (£59 tier).
//
//  Each tool executes by calling an EXISTING internal API with the manager's
//  forwarded Clerk cookie, so every endpoint's own auth + org scoping applies and
//  we reuse the real write paths (no duplicated Supabase logic). Results returned
//  to the model are COMPACT summaries: build_rota never hands the model the full
//  assignment payload (token-heavy and easy to mangle) — it saves the draft
//  server-side and returns only diagnostics + a draftId the human publishes.
//
//  Publishing is deliberately NOT a tool. The agent builds drafts and recommends;
//  a human clicks Publish. Outward-facing action stays human-gated.
// ════════════════════════════════════════════════════════════════════════════

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// Next Monday strictly in the future (matches the onboarding/builder convention).
export function nextMondayISO() {
  const d = new Date()
  d.setDate(d.getDate() + ((8 - (d.getDay() || 7)) % 7 || 7))
  return d.toISOString().slice(0, 10)
}

export const TOOLS = [
  {
    name: 'read_workspace',
    description: "Read the manager's teams, shifts, staff and the current staff-hours gap per team. Call this FIRST to understand the workspace and to get the team ids and staff ids you need for other tools.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_shift',
    description: 'Add a shift to a team: how many people on, when, whether it opens or closes, and its break. Times are 24h decimal hours (9 = 9am, 17.5 = 5:30pm). Days are 0=Monday..6=Sunday. The start-end span is the time at the venue (what the rota shows); a break is part of that span (8h worked with a 1h break is a 9h shift). Use a team_id from read_workspace.',
    input_schema: {
      type: 'object',
      properties: {
        team_id: { type: 'string' },
        name: { type: 'string', description: 'short label, e.g. "Opening", "Lunch cover", "Close"' },
        start: { type: 'number' },
        end: { type: 'number' },
        days: { type: 'array', items: { type: 'integer' }, description: '0=Mon..6=Sun' },
        staff: { type: 'integer', description: 'people needed on at once' },
        keyholder: { type: 'boolean' },
        anchor_type: { type: 'string', enum: ['open', 'close', 'fixed'], description: 'open = the opening shift, close = the closing shift, fixed = neither' },
        break_duration_mins: { type: 'number', description: 'unpaid break within the shift in minutes, e.g. 30 or 60' },
      },
      required: ['team_id', 'start', 'end', 'days', 'staff'],
    },
  },
  {
    name: 'update_shift',
    description: 'Change an existing shift by its id (from read_workspace). Pass only the fields you want to change: hours (start/end), staff, open/close (anchor_type), break, name or days.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        start: { type: 'number' },
        end: { type: 'number' },
        days: { type: 'array', items: { type: 'integer' } },
        staff: { type: 'integer' },
        keyholder: { type: 'boolean' },
        anchor_type: { type: 'string', enum: ['open', 'close', 'fixed'] },
        break_duration_mins: { type: 'number' },
      },
      required: ['id'],
    },
  },
  {
    name: 'remove_shift',
    description: 'Delete a shift by its id (from read_workspace). Use when refining a baseline rather than piling on duplicates.',
    input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'add_staff',
    description: 'Add a team member with a name and optional contracted weekly hours. They are added available all week so the solver can place them; the person refines their own availability later. Use a team_id from read_workspace.',
    input_schema: {
      type: 'object',
      properties: {
        team_id: { type: 'string' },
        name: { type: 'string' },
        contracted_hours: { type: 'number' },
        keyholder: { type: 'boolean' },
      },
      required: ['team_id', 'name'],
    },
  },
  {
    name: 'update_staff',
    description: "Change an existing team member by their id (from read_workspace). Use this to make someone a keyholder (or not), change their contracted weekly hours, move them to another team, or rename them. Pass only the fields you want to change.",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        keyholder: { type: 'boolean', description: 'true = a keyholder who can open/close, false = not' },
        contracted_hours: { type: 'number' },
        team_id: { type: 'string', description: 'move them to this team' },
        name: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'diagnose_rota',
    description: "Check whether a rota can build for a week WITHOUT saving anything, and return the exact reason any team cannot be scheduled. Use this to debug a build problem before changing anything. Pair it with read_workspace to explain shortfalls (each person works about 48h a week and one shift a day, so a long day needs several people even when total hours look enough).",
    input_schema: {
      type: 'object',
      properties: {
        weekStart: { type: 'string', description: 'Monday YYYY-MM-DD; omit for next week' },
        team_id: { type: 'string', description: 'omit to check all teams' },
      },
    },
  },
  {
    name: 'build_rota',
    description: 'Generate a rota for a week and save it as a DRAFT (never published). Builds the WHOLE rota (every team) by default. Returns diagnostics: teams built, teams skipped and why, and rule/contract issues. Use to build or rebuild after changes. Never tell the user a rota is published; only the manager can publish by reviewing the draft.',
    input_schema: {
      type: 'object',
      properties: {
        weekStart: { type: 'string', description: 'Monday YYYY-MM-DD; omit for next week' },
        weekCount: { type: 'integer', description: '1 to 4; default 1' },
        team_id: { type: 'string', description: 'OMIT this in almost every case so the whole rota (all teams) is built. Only pass a team id if the manager explicitly asked to build one single named team.' },
      },
    },
  },
]

export async function executeTool(name, input, { origin, cookie }) {
  const api = (path, opts = {}) => fetch(`${origin}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', cookie: cookie || '', ...(opts.headers || {}) } })
  try {
    if (name === 'read_workspace') {
      const [tr, sr, str] = await Promise.all([api('/api/teams'), api('/api/shifts'), api('/api/staff')])
      const teams = tr.ok ? await tr.json() : []
      const shifts = sr.ok ? await sr.json() : []
      const staff = str.ok ? await str.json() : []
      const teamRows = (Array.isArray(teams) ? teams : []).map((t) => {
        const ts = (Array.isArray(shifts) ? shifts : []).filter((s) => s.team_id === t.id)
        const req = ts.reduce((a, s) => a + (num(s.end) - num(s.start)) * (num(s.staff) || 1) * ((s.days || []).length || 1), 0)
        const people = (Array.isArray(staff) ? staff : []).filter((s) => s.team_id === t.id)
        const contracted = people.reduce((a, s) => a + num(s.contracted_hours ?? s.contracted), 0)
        return {
          team_id: t.id, name: t.name,
          required_hours: Math.round(req), contracted_hours: Math.round(contracted),
          staff_count: people.length,
          shifts: ts.map((s) => ({ id: s.id, name: s.name, start: s.start, end: s.end, days: s.days, staff: s.staff, keyholder: s.keyholder, anchor_type: s.anchor_type, break_mins: s.break_duration_mins })),
        }
      })
      return {
        ok: true,
        teams: teamRows,
        staff: (Array.isArray(staff) ? staff : []).map((s) => ({ id: s.id, name: s.name, team_id: s.team_id, contracted_hours: s.contracted_hours ?? s.contracted ?? 0, keyholder: s.keyholder ?? s.is_keyholder ?? false })),
      }
    }

    if (name === 'add_shift') {
      const body = { team_id: input.team_id, name: input.name || 'Cover', anchor_type: input.anchor_type || 'fixed', start: num(input.start), end: num(input.end), days: input.days || [], staff: num(input.staff) || 1, keyholder: !!input.keyholder, break_duration_mins: num(input.break_duration_mins), break_type: 'unpaid' }
      const r = await api('/api/shifts', { method: 'POST', body: JSON.stringify(body) })
      if (!r.ok) return { ok: false, error: `Could not add the shift (${r.status}).` }
      const tag = body.anchor_type === 'open' ? 'opening ' : body.anchor_type === 'close' ? 'closing ' : ''
      return { ok: true, summary: `Added ${tag}shift "${body.name}" (${body.staff} on, ${body.days.length} days)` }
    }

    if (name === 'update_shift') {
      const sr = await api('/api/shifts')
      const all = sr.ok ? await sr.json() : []
      const cur = (Array.isArray(all) ? all : []).find((x) => x.id === input.id)
      if (!cur) return { ok: false, error: 'That shift was not found.' }
      const m = { ...cur }
      for (const k of ['name', 'start', 'end', 'days', 'staff', 'keyholder', 'anchor_type', 'break_duration_mins']) if (input[k] !== undefined) m[k] = input[k]
      const r = await api('/api/shifts', {
        method: 'PUT',
        body: JSON.stringify({ id: input.id, team_id: cur.team_id, name: m.name, anchor_type: m.anchor_type || 'fixed', start: num(m.start), end: num(m.end), days: m.days || [], staff: num(m.staff) || 1, keyholder: !!m.keyholder, break_duration_mins: num(m.break_duration_mins), break_type: cur.break_type || 'unpaid' }),
      })
      if (!r.ok) return { ok: false, error: `Could not update the shift (${r.status}).` }
      return { ok: true, summary: `Updated shift "${m.name}"` }
    }

    if (name === 'remove_shift') {
      const r = await api(`/api/shifts?id=${encodeURIComponent(input.id)}`, { method: 'DELETE' })
      if (!r.ok) return { ok: false, error: `Could not delete the shift (${r.status}).` }
      return { ok: true, summary: 'Removed a shift' }
    }

    if (name === 'add_staff') {
      const availability = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
      const hours = num(input.contracted_hours)
      const body = { team_id: input.team_id, name: input.name, contracted_hours: hours, max_hours: Math.max(40, hours), hourly_rate: 0, keyholder: !!input.keyholder, availability }
      const r = await api('/api/staff', { method: 'POST', body: JSON.stringify(body) })
      if (!r.ok) return { ok: false, error: `Could not add that person (${r.status}).` }
      return { ok: true, summary: `Added ${input.name}${hours ? ` (${hours}h)` : ''}` }
    }

    if (name === 'update_staff') {
      const body = { id: input.id }
      if (input.keyholder !== undefined) body.keyholder = !!input.keyholder
      if (input.contracted_hours !== undefined) { body.contracted_hours = num(input.contracted_hours); body.max_hours = Math.max(40, num(input.contracted_hours)) }
      if (input.team_id !== undefined) body.team_id = input.team_id
      if (input.name !== undefined) body.name = input.name
      const r = await api('/api/staff', { method: 'PUT', body: JSON.stringify(body) })
      if (!r.ok) return { ok: false, error: `Could not update that person (${r.status}).` }
      const bits = []
      if (input.keyholder !== undefined) bits.push(input.keyholder ? 'made them a keyholder' : 'removed their keyholder status')
      if (input.contracted_hours !== undefined) bits.push(`set contracted hours to ${num(input.contracted_hours)}`)
      if (input.team_id !== undefined) bits.push('moved their team')
      if (input.name !== undefined) bits.push(`renamed to ${input.name}`)
      return { ok: true, summary: bits.length ? `Updated: ${bits.join(', ')}` : 'Updated the team member' }
    }

    if (name === 'diagnose_rota') {
      const weekStart = input.weekStart || nextMondayISO()
      const gr = await api('/api/generate-rota', { method: 'POST', body: JSON.stringify({ weekStart, weekCount: 1, team_id: input.team_id || null }) })
      const gd = gr.ok ? await gr.json() : null
      if (!gd) return { ok: false, error: 'Could not run the check right now. Try again in a moment.' }
      const skipped = (gd.skipped || []).map((s) => ({ team: s.teamName, reason: s.reason }))
      const failedChecks = (gd.rule_compliance || []).filter((r) => !r.ok).map((r) => r.label)
      return {
        ok: true, weekStart,
        builds: (gd.assignments || []).length > 0 && skipped.length === 0,
        assignment_count: (gd.assignments || []).length,
        skipped, failed_checks: failedChecks, contract_issues: (gd.contract_issues || []).length,
        note: 'Check only, no rota was saved.',
      }
    }

    if (name === 'build_rota') {
      const weekStart = input.weekStart || nextMondayISO()
      const gr = await api('/api/generate-rota', { method: 'POST', body: JSON.stringify({ weekStart, weekCount: input.weekCount || 1, team_id: input.team_id || null }) })
      const gd = gr.ok ? await gr.json() : null
      if (!gd || !gd.success || !((gd.assignments || []).length)) {
        return { ok: false, error: gd?.details || gd?.error || 'Could not build a rota, most likely too few staff hours for the shifts.', skipped: (gd?.skipped || []).map((s) => ({ team: s.teamName, reason: s.reason })) }
      }
      const name2 = `Week of ${weekStart}`
      const sr = await api('/api/rotas', { method: 'POST', body: JSON.stringify({ weekStart, name: name2, assignments: gd.assignments, status: 'Draft' }) })
      const sd = sr.ok ? await sr.json() : null
      const failedChecks = (gd.rule_compliance || []).filter((r) => !r.ok).map((r) => r.label)
      const skipped = (gd.skipped || []).map((s) => ({ team: s.teamName, reason: s.reason }))
      return {
        ok: true, draftId: sd?.id || null, weekStart,
        assignment_count: gd.assignments.length,
        skipped, failed_checks: failedChecks,
        contract_issues: (gd.contract_issues || []).length,
        time_off_conflicts: (gd.time_off_conflicts || []).length,
        summary: `Built a draft for ${weekStart}: ${gd.assignments.length} shifts assigned${skipped.length ? `, ${skipped.length} team(s) skipped` : ''}${failedChecks.length ? `, checks needing attention: ${failedChecks.join(', ')}` : ''}. Saved as a draft for review.`,
      }
    }

    return { ok: false, error: `Unknown tool ${name}` }
  } catch (e) {
    return { ok: false, error: e.message || 'Tool failed.' }
  }
}
