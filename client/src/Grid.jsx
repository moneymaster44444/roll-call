import { useEffect, useRef, useState } from 'react'

export default function Grid({ columns, partyCount, grid, members, classes, highlightId, onLocatePool, onDrop, onRemove, onEditClass }) {
  const [hoverKey, setHoverKey] = useState(null)
  const tableRef = useRef(null)

  // Scroll the highlighted player's cell into view (triggered by clicking their grayed-out pool chip).
  useEffect(() => {
    if (!highlightId || !tableRef.current) return
    const el = tableRef.current.querySelector(`td[data-member-cell="${highlightId}"]`)
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }, [highlightId])

  return (
    <section className="sheet" ref={tableRef}>
      <table>
        <thead>
          <tr>
            <th className="party-col" />
            {columns.map(col => <th key={col.id}>{col.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: partyCount }, (_, r) => (
            <tr key={r}>
              <td className="party-col">Party {r + 1}</td>
              {columns.map(col => {
                const key = `${r}:${col.id}`
                const a = grid[key]
                const member = a ? members.get(a.memberId) : null
                const cls = a ? classes[a.cls] : null
                const flashed = member && highlightId === member.id
                return (
                  <td
                    key={col.id}
                    data-member-cell={member ? member.id : undefined}
                    className={`cell ${a ? 'filled' : 'empty'} ${hoverKey === key ? 'hover' : ''} ${flashed ? 'flash-cell' : ''}`}
                    onDragOver={e => { e.preventDefault(); setHoverKey(key) }}
                    onDragLeave={() => setHoverKey(k => (k === key ? null : k))}
                    onDrop={e => {
                      e.preventDefault()
                      setHoverKey(null)
                      const rect = e.currentTarget.getBoundingClientRect()
                      try { onDrop(key, col.id, JSON.parse(e.dataTransfer.getData('text/plain')), rect) } catch {}
                    }}
                  >
                    {member ? (
                      <div
                        className="placed-chip"
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({
                            memberId: member.id, fromCell: key, cls: a.cls
                          }))
                        }}
                      >
                        <span
                          className="placed-name"
                          style={{ color: cls?.color || '#fff' }}
                          title="Click to show them in the player list"
                          onClick={() => onLocatePool(member.id)}
                        >
                          {member.name}
                        </span>
                        <button
                          className="placed-class"
                          style={{ background: cls?.color || '#555' }}
                          title="Click to change class"
                          onClick={() => onEditClass(key, member.id, col.id)}
                        >
                          {cls?.label || a.cls || 'pick class'}
                        </button>
                        <button className="remove" title="Remove" onClick={() => onRemove(key)}>×</button>
                      </div>
                    ) : (
                      <span className="drop-hint">drop here</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
