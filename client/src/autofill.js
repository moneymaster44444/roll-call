// Greedy scarcity-first auto-fill.
//
// Existing placements are treated as locked. Repeatedly:
//   1. Find the empty cell with the FEWEST eligible unplaced candidates
//      (scarce roles get filled before flexible ones can be wasted).
//   2. Give it the LEAST flexible candidate (fewest other columns they fit),
//      preferring confirmed "yes" attendees over maybes/unknowns.
// Stops when no empty cell has any candidate left.
export function autofill(members, columns, partyCount, grid) {
  const result = { ...grid }
  const placed = new Set(Object.values(result).map(a => a.memberId))
  const remaining = members.filter(m => !placed.has(m.id) && m.classes.length > 0)

  const emptyCells = []
  for (let r = 0; r < partyCount; r++) {
    for (const col of columns) {
      const key = `${r}:${col.id}`
      if (!result[key]) emptyCells.push({ key, col, row: r })
    }
  }

  const eligibleClasses = (m, col) => m.classes.filter(c => col.allowed.includes(c))
  const attendanceRank = (m) => (m.attendance === 'yes' ? 0 : m.attendance === 'maybe' ? 1 : 2)
  // How many distinct columns (of any row) this member could fill — lower = less flexible.
  const flexibility = (m) => columns.filter(col => eligibleClasses(m, col).length > 0).length

  const pool = new Set(remaining)
  const open = new Set(emptyCells)

  while (open.size > 0 && pool.size > 0) {
    let best = null
    for (const cell of open) {
      const candidates = [...pool].filter(m => eligibleClasses(m, cell.col).length > 0)
      if (candidates.length === 0) continue
      if (!best || candidates.length < best.candidates.length ||
          (candidates.length === best.candidates.length && cell.row < best.cell.row)) {
        best = { cell, candidates }
      }
    }
    if (!best) break

    best.candidates.sort((a, b) =>
      attendanceRank(a) - attendanceRank(b) ||
      flexibility(a) - flexibility(b) ||
      a.classes.length - b.classes.length ||
      a.name.localeCompare(b.name)
    )
    const pick = best.candidates[0]
    const cls = eligibleClasses(pick, best.cell.col)[0]
    result[best.cell.key] = { memberId: pick.id, cls }
    pool.delete(pick)
    open.delete(best.cell)
  }

  return result
}
