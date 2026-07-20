// ════════════════════════════════════════════════════════════════════════════
//  ROTA GRID COLOURS, single source of truth
//  ONE colour per team. Rows alternate filled / lightly-tinted ("tiger stripe")
//  by the staff member's position in their team section, so neighbouring rows
//  stay easy to track left-to-right. A drop shadow lifts every block off the
//  grid (no outline). Used by the live builder grid, the archive grid and the
//  shared rota image, change the look here, not in each consumer.
// ════════════════════════════════════════════════════════════════════════════

export const ALT_TINT = 0.83 // alternate row lightened this far toward white (0–1)

export function lightenHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt)
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// readable text colour (near-black or white) for a given background
export function textOn(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#1F2937' : '#fff'
}

// Block style for a staff row. `row` = the member's 0-based index within their team.
// Returns { filled, background, color, subColor, shadow }.
export function rotaBlock(teamColor, row) {
  const filled = row % 2 === 0
  const background = filled ? teamColor : lightenHex(teamColor, ALT_TINT)
  const color = filled ? textOn(teamColor) : '#1F2937'
  return {
    filled,
    background,
    color,
    subColor: filled ? (color === '#fff' ? 'rgba(255,255,255,.85)' : '#4B5563') : '#6B7280',
    shadow: `0 2px 6px ${teamColor}33`,
  }
}
