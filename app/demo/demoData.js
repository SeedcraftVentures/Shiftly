// Shared seed data for the public /demo/* marketing surfaces (builder + generate).
// Made-up staff, two teams (Front of House in pink, Kitchen in blue). No API, no
// persistence — these just drive the recordable demos for the features-page clips.

export const WEEK_START = '2026-10-12' // a Monday
export const TEAMS = [
  { id: 'foh', name: 'Front of House', color: '#FF1F7D' },
  { id: 'kit', name: 'Kitchen', color: '#0EA5E9' },
]
export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]))

export const STAFF = [
  { id: 's1', name: 'Alex Morgan', team_id: 'foh', contracted_hours: 38, is_keyholder: true },
  { id: 's2', name: 'Sam Patel', team_id: 'foh', contracted_hours: 32, is_keyholder: true },
  { id: 's3', name: 'Jordan Lee', team_id: 'foh', contracted_hours: 24, is_keyholder: false },
  { id: 's4', name: 'Priya Shah', team_id: 'foh', contracted_hours: 30, is_keyholder: false },
  { id: 'k1', name: 'Tom Fisher', team_id: 'kit', contracted_hours: 40, is_keyholder: true },
  { id: 'k2', name: 'Mia Rossi', team_id: 'kit', contracted_hours: 30, is_keyholder: false },
]

// Template shifts drive the Open / Mid / Close labels (earliest open, latest close per day).
export const SHIFTS = [
  { team_id: 'foh', days: [0, 1, 2, 3, 4, 5], start: 7, end: 15 },
  { team_id: 'foh', days: [0, 1, 2, 3, 4, 5], start: 14, end: 22 },
  { team_id: 'kit', days: [0, 1, 2, 3, 4, 5], start: 6, end: 14 },
  { team_id: 'kit', days: [0, 1, 2, 3, 4, 5], start: 14, end: 22 },
]

export const toHHMM = (d) => `${String(Math.floor(d)).padStart(2, '0')}:${String(Math.round((d - Math.floor(d)) * 60)).padStart(2, '0')}`

const teamOf = (sid) => STAFF.find((s) => s.id === sid)?.team_id || 'foh'
let _id = 0
const A = (sid, day, start, end, kh = false) => { const t = teamOf(sid); return { _id: _id++, week: 1, team_id: t, team_name: TEAM_BY_ID[t]?.name || '', staff_id: sid, shift_id: null, custom: true, shift_name: 'Shift', day, work_date: '', start_time: start, end_time: end, keyholder_required: kh } }

export const SEED = [
  // Front of House
  A('s1', 0, '07:00', '15:00', true), A('s1', 1, '07:00', '15:00', true), A('s1', 2, '09:00', '17:00'), A('s1', 3, '07:00', '15:00', true), A('s1', 4, '09:00', '17:00'),
  A('s2', 0, '14:00', '22:00', true), A('s2', 1, '14:00', '22:00', true), A('s2', 3, '14:00', '22:00', true), A('s2', 4, '14:00', '22:00', true),
  A('s3', 1, '12:00', '20:00'), A('s3', 2, '12:00', '20:00'), A('s3', 4, '12:00', '20:00'), A('s3', 5, '12:00', '20:00'),
  A('s4', 0, '09:00', '17:00'), A('s4', 2, '07:00', '15:00'), A('s4', 3, '09:00', '17:00'), A('s4', 5, '09:00', '17:00'),
  // Kitchen
  A('k1', 0, '06:00', '14:00', true), A('k1', 1, '06:00', '14:00', true), A('k1', 2, '06:00', '14:00', true), A('k1', 4, '14:00', '22:00', true), A('k1', 5, '06:00', '14:00', true),
  A('k2', 0, '14:00', '22:00'), A('k2', 1, '14:00', '22:00'), A('k2', 3, '06:00', '14:00'), A('k2', 4, '14:00', '22:00'),
]

// highest seed id, so dynamically-added shifts (builder) start above it
export const NEXT_ID = _id
