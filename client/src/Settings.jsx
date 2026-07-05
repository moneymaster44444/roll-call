export default function Settings({ classes, columns, setColumns, partyCount, setPartyCount, onEditClasses, onSaveDefaults }) {
  const update = (i, patch) =>
    setColumns(cols => cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const toggleClass = (i, cls) =>
    setColumns(cols => cols.map((c, idx) => {
      if (idx !== i) return c
      const allowed = c.allowed.includes(cls)
        ? c.allowed.filter(x => x !== cls)
        : [...c.allowed, cls]
      return { ...c, allowed }
    }))

  const addColumn = () =>
    setColumns(cols => [...cols, { id: `col${Date.now()}`, name: 'New column', allowed: [] }])

  const removeColumn = (i) =>
    setColumns(cols => cols.filter((_, idx) => idx !== i))

  const move = (i, dir) =>
    setColumns(cols => {
      const j = i + dir
      if (j < 0 || j >= cols.length) return cols
      const next = [...cols]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  return (
    <div className="settings">
      <div className="settings-row">
        <label>
          Parties:{' '}
          <input
            type="number" min="1" max="15" value={partyCount}
            onChange={e => setPartyCount(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
          />
        </label>
        <button className="btn" onClick={addColumn}>+ Add column</button>
        <button className="btn" onClick={onSaveDefaults} title="Write the current columns and party count to config/columns.json">
          💾 Save as default
        </button>
        <button className="btn" onClick={onEditClasses} title="Edit the emoji-to-class mapping and attendance emojis">
          🏷️ Edit classes…
        </button>
        <span className="hint">Column changes apply to this session; “Save as default” makes them permanent.</span>
      </div>
      <div className="settings-cols">
        {columns.map((col, i) => (
          <div key={col.id} className="settings-col">
            <div className="settings-col-head">
              <input value={col.name} onChange={e => update(i, { name: e.target.value })} />
              <button className="mini" onClick={() => move(i, -1)} title="Move left">◀</button>
              <button className="mini" onClick={() => move(i, +1)} title="Move right">▶</button>
              <button className="mini danger" onClick={() => removeColumn(i)} title="Remove column">×</button>
            </div>
            <div className="settings-classes">
              {Object.entries(classes).map(([key, c]) => (
                <label key={key} className="settings-class">
                  <input
                    type="checkbox"
                    checked={col.allowed.includes(key)}
                    onChange={() => toggleClass(i, key)}
                  />
                  <span className="class-tag" style={{ background: c.color }}>{c.short}</span>
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
