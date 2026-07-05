import { useEffect, useRef, useState } from 'react'

export default function Pool({ members, classes, placedIds, highlightId, onLocate, onDropBack }) {
  const [filter, setFilter] = useState('')
  const [unassignedFirst, setUnassignedFirst] = useState(false)
  const listRef = useRef(null)

  // Scroll the highlighted chip into view (triggered by clicking a player on the grid).
  useEffect(() => {
    if (!highlightId || !listRef.current) return
    const el = listRef.current.querySelector(`.chip[data-member-id="${highlightId}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightId])

  const sorted = [...members].sort((a, b) => {
    if (unassignedFirst) {
      const pa = placedIds.has(a.id) ? 1 : 0
      const pb = placedIds.has(b.id) ? 1 : 0
      if (pa !== pb) return pa - pb
    }
    return a.name.localeCompare(b.name)
  })
  const shown = sorted.filter(m => {
    if (m.id === highlightId) return true // never hide the chip we're pointing at
    if (!filter) return true
    const f = filter.toLowerCase()
    return m.name.toLowerCase().includes(f) ||
      m.classes.some(c => (classes[c]?.label || c).toLowerCase().includes(f))
  })
  const unplacedCount = members.filter(m => !placedIds.has(m.id)).length

  return (
    <aside
      className="pool"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        try { onDropBack(JSON.parse(e.dataTransfer.getData('text/plain'))) } catch {}
      }}
    >
      <div className="pool-head">
        <h2>Players <span className="count">{unplacedCount} left</span></h2>
        <input
          className="filter-input"
          placeholder="Filter by name or class…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="pool-tools">
          <button
            className={`btn small ${unassignedFirst ? 'active' : ''}`}
            title="Sort players who still need a slot to the top"
            onClick={() => setUnassignedFirst(v => !v)}
          >
            ⬆ Unassigned first
          </button>
        </div>
      </div>
      {members.length === 0 && (
        <p className="hint">Fetch the signup post (or load the sample) to see players here. Drag a player onto the sheet to place them. Drag them back here to unplace.</p>
      )}
      <div className="chips" ref={listRef}>
        {shown.map(m => {
          const placed = placedIds.has(m.id)
          return (
            <div
              key={m.id}
              data-member-id={m.id}
              className={`chip ${placed ? 'placed' : ''} ${highlightId === m.id ? 'flash' : ''}`}
              draggable
              title={placed ? 'Click to show where they are on the sheet' : undefined}
              onClick={() => { if (placed) onLocate(m.id) }}
              onDragStart={e => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ memberId: m.id }))
                e.dataTransfer.effectAllowed = 'move'
              }}
            >
              <span className="chip-name">
                {m.attendance === 'yes' && <span className="badge yes" title="Confirmed">✓</span>}
                {m.attendance === 'maybe' && <span className="badge maybe" title="Maybe">?</span>}
                {m.attendance == null && <span className="badge unknown" title="Didn't answer yes/maybe">·</span>}
                {m.name}
              </span>
              <span className="chip-classes">
                {m.classes.map(c => (
                  <span key={c} className="class-tag" style={{ background: classes[c]?.color || '#666' }}
                    title={classes[c]?.label || c}>
                    {classes[c]?.short || c}
                  </span>
                ))}
                {m.classes.length === 0 && <span className="class-tag none">no classes</span>}
              </span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
