import { useEffect, useRef, useState } from 'react'
import FilterPanel from './FilterPanel.jsx'

const ATT_ORDER = { yes: 0, maybe: 1 }

export default function Pool({ members, classes, groups, placedIds, highlightId, onLocate, onDropBack, onVisibleChange }) {
  const [filter, setFilter] = useState('')
  const [selectedClasses, setSelectedClasses] = useState(new Set())
  const [sortMode, setSortMode] = useState('alpha')
  const [panelOpen, setPanelOpen] = useState(false)
  const listRef = useRef(null)

  // Scroll the highlighted chip into view (triggered by clicking a player on the grid).
  useEffect(() => {
    if (!highlightId || !listRef.current) return
    const el = listRef.current.querySelector(`.chip[data-member-id="${highlightId}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightId])

  // Unset "New Player" placeholders live only on the grid, not in this list.
  const roster = members.filter(m => !m.placeholder)

  const sorted = [...roster].sort((a, b) => {
    if (sortMode === 'unassigned') {
      const d = (placedIds.has(a.id) ? 1 : 0) - (placedIds.has(b.id) ? 1 : 0)
      if (d !== 0) return d
    } else if (sortMode === 'attendance') {
      const d = (ATT_ORDER[a.attendance] ?? 2) - (ATT_ORDER[b.attendance] ?? 2)
      if (d !== 0) return d
    } else if (sortMode === 'flex') {
      const d = a.classes.length - b.classes.length
      if (d !== 0) return d
    }
    return a.name.localeCompare(b.name)
  })

  // "matches" is the pure filter result; "shown" additionally keeps the chip
  // being highlighted visible even if the filter would hide it.
  const matches = sorted.filter(m => {
    if (selectedClasses.size > 0 && !m.classes.some(c => selectedClasses.has(c))) return false
    if (!filter) return true
    const f = filter.toLowerCase()
    return m.name.toLowerCase().includes(f) ||
      m.classes.some(c => (classes[c]?.label || c).toLowerCase().includes(f))
  })
  const matchIds = new Set(matches.map(m => m.id))
  const shown = sorted.filter(m => matchIds.has(m.id) || m.id === highlightId)

  // Tell the app which players are visible and which classes are picked, so
  // Auto-fill only uses those players — and only in those classes.
  const matchIdsStr = matches.map(m => m.id).join(',')
  const selClassesStr = [...selectedClasses].sort().join(',')
  useEffect(() => {
    onVisibleChange?.({
      ids: matchIdsStr ? new Set(matchIdsStr.split(',')) : new Set(),
      classes: selClassesStr ? new Set(selClassesStr.split(',')) : new Set()
    })
  }, [matchIdsStr, selClassesStr])

  const unplacedCount = roster.filter(m => !placedIds.has(m.id)).length
  const hiddenCount = roster.length - matches.length
  const filterActive = selectedClasses.size > 0 || filter.trim().length > 0

  const clearFilters = () => {
    setSelectedClasses(new Set())
    setFilter('')
  }

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
            className={`btn small ${selectedClasses.size > 0 ? 'active' : ''}`}
            onClick={() => setPanelOpen(true)}
          >
            🔍 Filter by…{selectedClasses.size > 0 ? ` (${selectedClasses.size})` : ''}
          </button>
        </div>
        {filterActive && hiddenCount > 0 && (
          <div className="pool-filter-note">
            <span>{hiddenCount} player{hiddenCount > 1 ? 's' : ''} filtered out</span>
            <button className="btn small" onClick={clearFilters}>Remove filter</button>
          </div>
        )}
      </div>
      {roster.length === 0 && (
        <p className="hint">Fetch the signup post (or load the sample) to see players here. Drag a player onto the sheet to place them. Drag them back here to unplace.</p>
      )}
      <div className="chips" ref={listRef}>
        <div
          className="chip new-player"
          draggable
          title="Drag onto the sheet to add a fill-in player"
          onDragStart={e => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ newPlayer: true }))
            e.dataTransfer.effectAllowed = 'move'
          }}
        >
          <span className="chip-name">➕ New Player</span>
          <span className="new-player-hint">drag onto the sheet, name them there</span>
        </div>
        {shown.map(m => {
          const placed = placedIds.has(m.id)
          return (
            <div
              key={m.id}
              data-member-id={m.id}
              className={`chip ${placed ? 'placed' : ''} ${highlightId === m.id ? 'flash' : ''}`}
              draggable={!placed}
              title={placed ? 'Click to show where they are on the sheet' : undefined}
              onClick={() => { if (placed) onLocate(m.id) }}
              onDragStart={e => {
                if (placed) { e.preventDefault(); return }
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

      {panelOpen && (
        <FilterPanel
          groups={groups}
          classes={classes}
          selected={selectedClasses}
          setSelected={setSelectedClasses}
          sortMode={sortMode}
          setSortMode={setSortMode}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </aside>
  )
}
