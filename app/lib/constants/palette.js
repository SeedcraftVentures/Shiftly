// Team colour palette — references CSS custom properties defined in globals.css.
// Use assignTeamColor(index) to map teams to colours consistently.

export const PALETTE = [
  'var(--team-purple)',
  'var(--team-green)',
  'var(--team-blue)',
  'var(--team-orange)',
  'var(--team-red)',
  'var(--team-indigo)',
]

export const PALETTE_LIGHT = [
  'var(--team-purple-light)',
  'var(--team-green-light)',
  'var(--team-blue-light)',
  'var(--team-orange-light)',
  'var(--team-red-light)',
  'var(--team-indigo-light)',
]

export function assignTeamColor(index) {
  return {
    color: PALETTE[index % PALETTE.length],
    colorLight: PALETTE_LIGHT[index % PALETTE_LIGHT.length],
  }
}
