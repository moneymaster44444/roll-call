import { useState } from 'react'
import ClassTagGroups from './ClassTagGroups.jsx'

// Popup for turning a "New Player" placeholder into a real player: set the
// name and multi-pick their classes, organized by the class groupings
// (same layout as the filter control).
export default function NewPlayerModal({ classes, groups, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [picked, setPicked] = useState(new Set())
  const [error, setError] = useState(null)

  const toggle = (cls) => {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(cls)) next.delete(cls)
      else next.add(cls)
      return next
    })
  }

  function save() {
    if (!name.trim()) return setError('Enter a player name.')
    if (picked.size === 0) return setError('Pick at least one class.')
    onSave(name.trim(), [...picked])
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="picker filter-panel" onClick={e => e.stopPropagation()}>
        <h3>Choose name and class</h3>

        <label className="sort-row">
          Name
          <input
            type="text"
            value={name}
            autoFocus
            placeholder="Player name"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
          />
        </label>

        <div className="filter-groups-head">
          <span>Pick the class(es) this player can play</span>
        </div>

        <ClassTagGroups
          groups={groups}
          classes={classes}
          selected={picked}
          onToggle={toggle}
        />

        {error && <div className="banner error">{error}</div>}
        <div className="confirm-actions">
          <button className="btn primary" onClick={save}>Save</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
