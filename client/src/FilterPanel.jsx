import ClassTagGroups from './ClassTagGroups.jsx'

// Popup with the pool's filtering and sorting controls: a sort-mode dropdown
// and class tags to multi-pick, organized by the groupings scraped from the
// Discord signup posts (config roles fill in the rest).
export default function FilterPanel({ groups, classes, selected, setSelected, sortMode, setSortMode, onClose }) {
  const toggle = (cls) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cls)) next.delete(cls)
      else next.add(cls)
      return next
    })
  }

  const setGroup = (group, on) => {
    setSelected(prev => {
      const next = new Set(prev)
      group.classes.forEach(c => (on ? next.add(c) : next.delete(c)))
      return next
    })
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="picker filter-panel" onClick={e => e.stopPropagation()}>
        <h3>Filter &amp; sort players</h3>

        <label className="sort-row">
          Sort by
          <select value={sortMode} onChange={e => setSortMode(e.target.value)}>
            <option value="alpha">Alphabetical</option>
            <option value="unassigned">Unassigned to the top</option>
            <option value="attendance">Confirmed first (✓ → ? → no answer)</option>
            <option value="flex">Fewest classes first (least flexible)</option>
          </select>
        </label>

        <div className="filter-groups-head">
          <span>Show only players with any of the picked classes</span>
          {selected.size > 0 && (
            <button className="btn small" onClick={() => setSelected(new Set())}>Clear picks</button>
          )}
        </div>

        <ClassTagGroups
          groups={groups}
          classes={classes}
          selected={selected}
          onToggle={toggle}
          onSetGroup={setGroup}
        />

        <button className="btn primary" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
