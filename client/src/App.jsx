import { useEffect, useMemo, useRef, useState } from 'react'
import Pool from './Pool.jsx'
import Grid from './Grid.jsx'
import Settings from './Settings.jsx'
import ClassPicker from './ClassPicker.jsx'
import ClassesEditor from './ClassesEditor.jsx'
import { autofill } from './autofill.js'
import { exportPng } from './exportPng.js'

export default function App() {
  const [classes, setClasses] = useState(null)      // emojiName -> {label, short, color}
  const [attendance, setAttendance] = useState({ yes: [], maybe: [] })
  const [classesEditorOpen, setClassesEditorOpen] = useState(false)
  const [columns, setColumns] = useState([])        // [{id, name, allowed:[]}]
  const [partyCount, setPartyCount] = useState(5)
  const [members, setMembers] = useState([])
  const [unmapped, setUnmapped] = useState([])
  const [grid, setGrid] = useState({})              // "row:colId" -> {memberId, cls}
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [status, setStatus] = useState(null)        // {kind:'error'|'info', text}
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [picker, setPicker] = useState(null)        // {cellKey, memberId, colId}
  const [highlightGrid, setHighlightGrid] = useState(null) // memberId to flash on the grid
  const [highlightPool, setHighlightPool] = useState(null) // memberId to flash in the pool
  const [flyBack, setFlyBack] = useState(null)      // {memberId, fromRect, key} overwrite animation
  const [confirmExport, setConfirmExport] = useState(false)
  const flashTimers = useRef({})

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.error) throw new Error(cfg.error)
        setClasses(cfg.classes.classes)
        setAttendance(cfg.classes.attendance || { yes: [], maybe: [] })
        setColumns(cfg.columns.columns)
        setPartyCount(cfg.columns.parties || 5)
      })
      .catch(e => setStatus({ kind: 'error', text: 'Could not load config: ' + e.message }))
  }, [])

  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const placedIds = useMemo(() => new Set(Object.values(grid).map(a => a.memberId)), [grid])
  const colById = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns])
  const unassigned = useMemo(() => members.filter(m => !placedIds.has(m.id)), [members, placedIds])

  function flash(which, memberId) {
    const set = which === 'grid' ? setHighlightGrid : setHighlightPool
    set(memberId)
    clearTimeout(flashTimers.current[which])
    flashTimers.current[which] = setTimeout(() => set(null), 1800)
  }

  async function loadRoster(url, body) {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(url, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : undefined)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
      setMembers(data.members)
      setUnmapped(data.unmappedEmojis || [])
      setGrid({})
      setStatus({
        kind: 'info',
        text: `Loaded ${data.members.length} members` +
          (data.postsScanned ? ` from ${data.postsScanned} post${data.postsScanned > 1 ? 's' : ''}` : '') +
          (data.mock ? ' (sample data)' : '') + '.'
      })
    } catch (e) {
      setStatus({ kind: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(cellKey, colId, payload, cellRect) {
    const member = byId.get(payload.memberId)
    if (!member) return
    const col = colById.get(colId)
    const prev = grid[cellKey]
    const bumped = prev && prev.memberId !== member.id && cellRect
      ? { memberId: prev.memberId, fromRect: cellRect }
      : null

    const next = { ...grid }
    if (payload.fromCell) delete next[payload.fromCell]
    // If they're already placed somewhere else (dragged from pool while placed), remove that too.
    for (const [k, a] of Object.entries(next)) {
      if (a.memberId === member.id) delete next[k]
    }
    const eligible = member.classes.filter(c => col.allowed.includes(c))
    const keepCls = payload.cls && col.allowed.includes(payload.cls) ? payload.cls : null
    // Silent assignment is only OK when it doesn't change a class the player
    // already had on the sheet: fresh from the pool with one fit, or their
    // current class still fits. Anything else must be confirmed in the picker.
    const cls = keepCls || (!payload.cls && eligible.length === 1 ? eligible[0] : null)

    if (cls) {
      next[cellKey] = { memberId: member.id, cls }
      setGrid(next)
      if (bumped) bumpToPool(bumped)
    } else {
      // Ambiguous (or nothing signed that fits) — place them provisionally,
      // keeping whatever class they showed before the drag, and let the picker
      // finalize the move. Cancel restores the pre-drag grid, overwrites included.
      next[cellKey] = { memberId: member.id, cls: payload.cls || null }
      setGrid(next)
      setPicker({ cellKey, memberId: member.id, colId, prevGrid: grid, bumped })
    }
  }

  // Animate an overwritten player's token back to the pool.
  function bumpToPool(bumped) {
    setFlyBack({ ...bumped, key: Date.now() })
    flash('pool', bumped.memberId)
  }

  function removeFromCell(cellKey) {
    setGrid(g => {
      const next = { ...g }
      delete next[cellKey]
      return next
    })
  }

  function setCellClass(cellKey, cls) {
    setGrid(g => (g[cellKey] ? { ...g, [cellKey]: { ...g[cellKey], cls } } : g))
    if (picker?.bumped) bumpToPool(picker.bumped)
    setPicker(null)
  }

  function cancelPicker() {
    // If the picker came from a drag, undo the whole move (and any overwrite).
    if (picker?.prevGrid) setGrid(picker.prevGrid)
    setPicker(null)
  }

  function runAutofill() {
    setGrid(g => autofill(members, columns, partyCount, g))
  }

  // Persist the classes editor's result to disk, then sync every piece of
  // in-memory state that references class keys with any renames.
  async function saveClasses(payload) {
    try {
      const res = await fetch('/api/config/classes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Save failed (${res.status})`)
      setClasses(payload.classes)
      setAttendance(payload.attendance)
      const renames = payload.renames || {}
      if (Object.keys(renames).length > 0) {
        setColumns(cols => cols.map(c => ({ ...c, allowed: c.allowed.map(a => renames[a] || a) })))
        setMembers(ms => ms.map(m => ({ ...m, classes: m.classes.map(c => renames[c] || c) })))
        setGrid(g => Object.fromEntries(
          Object.entries(g).map(([k, a]) => [k, { ...a, cls: renames[a.cls] || a.cls }])
        ))
      }
      setClassesEditorOpen(false)
      setStatus({ kind: 'info', text: 'Classes saved.' })
      return null
    } catch (e) {
      return e.message
    }
  }

  async function saveColumnsDefault() {
    try {
      const res = await fetch('/api/config/columns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parties: partyCount, columns })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Save failed (${res.status})`)
      setStatus({ kind: 'info', text: 'Current columns & party count saved as the new default.' })
    } catch (e) {
      setStatus({ kind: 'error', text: e.message })
    }
  }

  function download() {
    if (unassigned.length > 0) setConfirmExport(true)
    else doExport()
  }

  function doExport() {
    setConfirmExport(false)
    exportPng({ title: title.trim(), columns, partyCount, grid, members, classes })
  }

  if (!classes) {
    return <div className="loading">{status ? status.text : 'Loading…'}</div>
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>RollCall</h1>
        <input
          className="link-input"
          placeholder="Paste the message link of the FIRST signup post (follow-up posts are found automatically)…"
          value={link}
          onChange={e => setLink(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && link.trim()) loadRoster('/api/roster', { link: link.trim() }) }}
        />
        <button className="btn primary" disabled={busy || !link.trim()}
          onClick={() => loadRoster('/api/roster', { link: link.trim() })}>
          {busy ? 'Fetching…' : 'Fetch signups'}
        </button>
        <button className="btn" disabled={busy} onClick={() => loadRoster('/api/mock')}>
          Load sample
        </button>
      </header>

      {status && <div className={`banner ${status.kind}`}>{status.text}</div>}
      {unmapped.length > 0 && (
        <div className="banner warn">
          Emojis on the post that aren&apos;t in config/classes.json (add them there if they matter):{' '}
          {unmapped.map(e => `:${e}:`).join('  ')}
        </div>
      )}

      <div className="toolbar">
        <input
          className="title-input"
          placeholder="Sheet title, e.g. Saturday July 5 @ 7:30pm EST"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button className="btn" onClick={runAutofill} disabled={members.length === 0}>✨ Auto-fill</button>
        <button className="btn" onClick={() => setGrid({})} disabled={Object.keys(grid).length === 0}>Clear sheet</button>
        <button className="btn" onClick={() => setSettingsOpen(o => !o)}>
          {settingsOpen ? 'Close settings' : '⚙ Columns & parties'}
        </button>
        <button className="btn primary" onClick={download} disabled={Object.keys(grid).length === 0}>
          ⬇ Download PNG
        </button>
      </div>

      {settingsOpen && (
        <Settings
          classes={classes}
          columns={columns}
          setColumns={setColumns}
          partyCount={partyCount}
          setPartyCount={setPartyCount}
          onEditClasses={() => setClassesEditorOpen(true)}
          onSaveDefaults={saveColumnsDefault}
        />
      )}

      <main className="layout">
        <Pool
          members={members}
          classes={classes}
          placedIds={placedIds}
          highlightId={highlightPool}
          onLocate={id => flash('grid', id)}
          onDropBack={(payload) => { if (payload.fromCell) removeFromCell(payload.fromCell) }}
        />
        <Grid
          columns={columns}
          partyCount={partyCount}
          grid={grid}
          members={byId}
          classes={classes}
          highlightId={highlightGrid}
          onLocatePool={id => flash('pool', id)}
          onDrop={handleDrop}
          onRemove={removeFromCell}
          onEditClass={(cellKey, memberId, colId) => setPicker({ cellKey, memberId, colId })}
        />
      </main>

      {picker && (
        <ClassPicker
          member={byId.get(picker.memberId)}
          column={colById.get(picker.colId)}
          classes={classes}
          onPick={cls => setCellClass(picker.cellKey, cls)}
          onCancel={cancelPicker}
        />
      )}

      {classesEditorOpen && (
        <ClassesEditor
          classes={classes}
          attendance={attendance}
          onSave={saveClasses}
          onCancel={() => setClassesEditorOpen(false)}
        />
      )}

      {flyBack && (
        <FlyBack
          key={flyBack.key}
          member={byId.get(flyBack.memberId)}
          fromRect={flyBack.fromRect}
          onDone={() => setFlyBack(null)}
        />
      )}

      {confirmExport && (
        <div className="overlay" onClick={() => setConfirmExport(false)}>
          <div className="picker" onClick={e => e.stopPropagation()}>
            <h3>⚠ {unassigned.length} player{unassigned.length > 1 ? 's are' : ' is'} still unassigned</h3>
            <p className="hint confirm-names">
              {unassigned.slice(0, 12).map(m => m.name).join(', ')}
              {unassigned.length > 12 ? ` … and ${unassigned.length - 12} more` : ''}
            </p>
            <div className="confirm-actions">
              <button className="btn primary" onClick={doExport}>Download anyway</button>
              <button className="btn" onClick={() => setConfirmExport(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Ghost token that flies from an overwritten grid cell back to the player's
// chip in the pool, so overwrites are visually obvious.
function FlyBack({ member, fromRect, onDone }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !member) { onDone(); return }
    const target = document.querySelector(`.chip[data-member-id="${member.id}"]`)
    if (target) target.scrollIntoView({ block: 'nearest' })
    const to = target ? target.getBoundingClientRect() : { left: 30, top: 200 }
    el.style.transform = `translate(${fromRect.left}px, ${fromRect.top}px)`
    // Two frames so the start position paints before the transition kicks in.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(${to.left}px, ${to.top}px)`
      el.style.opacity = '0.2'
    }))
    const t = setTimeout(onDone, 700)
    return () => clearTimeout(t)
  }, [])

  if (!member) return null
  return <div ref={ref} className="fly-chip">{member.name}</div>
}
