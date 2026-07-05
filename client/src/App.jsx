import { useEffect, useMemo, useRef, useState } from 'react'
import Pool from './Pool.jsx'
import Grid from './Grid.jsx'
import Settings from './Settings.jsx'
import ClassPicker from './ClassPicker.jsx'
import ClassesEditor from './ClassesEditor.jsx'
import NewPlayerModal from './NewPlayerModal.jsx'
import { autofill } from './autofill.js'
import { exportPng } from './exportPng.js'

export default function App() {
  const [classes, setClasses] = useState(null)      // emojiName -> {label, short, color}
  const [attendance, setAttendance] = useState({ yes: [], maybe: [] })
  const [classesEditorOpen, setClassesEditorOpen] = useState(false)
  const [columns, setColumns] = useState([])        // [{id, name, allowed:[]}]
  const [partyCount, setPartyCount] = useState(5)
  const [members, setMembers] = useState([])
  const [groups, setGroups] = useState([])          // [{name, classes:[]}] from the Discord posts
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
  const [poolView, setPoolView] = useState(null)  // {ids, classes} — the pool's filter state; null until the pool reports
  const [newPlayerEditor, setNewPlayerEditor] = useState(null) // {cellKey, memberId, colId}
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

  // Every class organized into groups: the scraped Discord groupings first,
  // then any class not covered by them under its configured 'role' (falling
  // back to "Unknown"). Used by the new-player popup and the classes editor.
  const classGroups = useMemo(() => {
    if (!classes) return []
    const result = (groups || [])
      .map(g => ({ name: g.name, classes: g.classes.filter(c => classes[c]) }))
      .filter(g => g.classes.length > 0)
    const covered = new Set(result.flatMap(g => g.classes))
    for (const [key, c] of Object.entries(classes)) {
      if (covered.has(key)) continue
      const roleName = c.role?.trim() || 'Unknown'
      let g = result.find(x => x.name === roleName)
      if (!g) { g = { name: roleName, classes: [] }; result.push(g) }
      g.classes.push(key)
    }
    return result
  }, [classes, groups])

  // The filter only offers classes that at least one column accepts.
  const filterableGroups = useMemo(() => {
    const allowed = new Set(columns.flatMap(c => c.allowed))
    return classGroups
      .map(g => ({ ...g, classes: g.classes.filter(c => allowed.has(c)) }))
      .filter(g => g.classes.length > 0)
  }, [classGroups, columns])

  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const placedIds = useMemo(() => new Set(Object.values(grid).map(a => a.memberId)), [grid])
  const colById = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns])
  const unassigned = useMemo(() => members.filter(m => !placedIds.has(m.id) && !m.placeholder), [members, placedIds])
  // Placed "New Player" chips whose name/class hasn't been chosen yet.
  const placeholderCells = useMemo(() =>
    Object.entries(grid)
      .filter(([, a]) => byId.get(a.memberId)?.placeholder)
      .map(([key]) => {
        const [row, colId] = key.split(':')
        return { key, party: Number(row) + 1, column: colById.get(colId)?.name || colId }
      })
      .sort((a, b) => a.party - b.party),
  [grid, byId, colById])

  // Placeholders removed from the grid (bumped, ×-ed, or dragged back to the
  // pool) are discarded entirely — they only exist as a grid cell until named.
  useEffect(() => {
    setMembers(ms => (
      ms.some(m => m.placeholder && !placedIds.has(m.id))
        ? ms.filter(m => !m.placeholder || placedIds.has(m.id))
        : ms
    ))
  }, [placedIds])

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
      setGroups(data.groups || [])
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
    // The "New Player" chip: create a placeholder member directly in the cell.
    if (payload.newPlayer) {
      const prev = grid[cellKey]
      const bumped = prev && cellRect ? { memberId: prev.memberId, fromRect: cellRect } : null
      const id = `custom-${Date.now()}`
      setMembers(ms => [...ms, { id, name: 'New Player', classes: [], attendance: null, placeholder: true, custom: true }])
      setGrid(g => ({ ...g, [cellKey]: { memberId: id, cls: null } }))
      if (bumped) bumpToPool(bumped)
      return
    }

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

    // Moving an unnamed placeholder between cells: no class logic, no picker.
    if (member.placeholder) {
      next[cellKey] = { memberId: member.id, cls: null }
      setGrid(next)
      if (bumped) bumpToPool(bumped)
      return
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
    // Respect the pool's filter: only fill with players currently visible
    // there, and when classes are picked, only place people AS those classes
    // (so they only go into columns matching the filter).
    let pool = members
    if (poolView) {
      pool = members.filter(m => poolView.ids.has(m.id))
      if (poolView.classes.size > 0) {
        pool = pool.map(m => ({ ...m, classes: m.classes.filter(c => poolView.classes.has(c)) }))
      }
    }
    setGrid(g => autofill(pool, columns, partyCount, g))
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

  // Turn a placeholder into a real player, then settle the cell's class the
  // same way a drop would: auto-assign a single fit, otherwise ask.
  function saveNewPlayer(name, classList) {
    const { cellKey, memberId, colId } = newPlayerEditor
    setMembers(ms => ms.map(m => (m.id === memberId ? { ...m, name, classes: classList, placeholder: false } : m)))
    const col = colById.get(colId)
    const eligible = classList.filter(c => col.allowed.includes(c))
    if (eligible.length === 1) {
      setGrid(g => (g[cellKey] ? { ...g, [cellKey]: { memberId, cls: eligible[0] } } : g))
    } else {
      setPicker({ cellKey, memberId, colId })
    }
    setNewPlayerEditor(null)
  }

  function download() {
    if (unassigned.length > 0 || placeholderCells.length > 0) setConfirmExport(true)
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

      <div className={`toolbar ${settingsOpen ? 'tabbed' : ''}`}>
        <input
          className="title-input"
          placeholder="Sheet title, e.g. Saturday July 5 @ 7:30pm EST"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button className="btn" onClick={runAutofill} disabled={members.length === 0}>✨ Auto-fill</button>
        <button className="btn" onClick={() => setGrid({})} disabled={Object.keys(grid).length === 0}>Clear sheet</button>
        <button className={`btn ${settingsOpen ? 'tab-active' : ''}`} onClick={() => setSettingsOpen(o => !o)}>
          ⚙ Columns &amp; parties
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
          groups={filterableGroups}
          placedIds={placedIds}
          highlightId={highlightPool}
          onLocate={id => flash('grid', id)}
          onDropBack={(payload) => { if (payload.fromCell) removeFromCell(payload.fromCell) }}
          onVisibleChange={setPoolView}
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
          onSetupPlayer={(cellKey, memberId, colId) => setNewPlayerEditor({ cellKey, memberId, colId })}
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

      {newPlayerEditor && (
        <NewPlayerModal
          classes={classes}
          groups={classGroups}
          onSave={saveNewPlayer}
          onCancel={() => setNewPlayerEditor(null)}
        />
      )}

      {classesEditorOpen && (
        <ClassesEditor
          classes={classes}
          attendance={attendance}
          groups={classGroups}
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
            <h3>⚠ The sheet isn&apos;t finished</h3>
            {placeholderCells.length > 0 && (
              <>
                <p className="hint confirm-names">
                  {placeholderCells.length} placeholder chip{placeholderCells.length > 1 ? 's' : ''} without a name and class:
                </p>
                <ul className="confirm-list">
                  {placeholderCells.map(p => (
                    <li key={p.key}>Party {p.party} — {p.column}</li>
                  ))}
                </ul>
              </>
            )}
            {unassigned.length > 0 && (
              <>
                <p className="hint confirm-names">
                  {unassigned.length} player{unassigned.length > 1 ? 's' : ''} still unassigned:
                </p>
                <p className="confirm-names">
                  {unassigned.slice(0, 12).map(m => m.name).join(', ')}
                  {unassigned.length > 12 ? ` … and ${unassigned.length - 12} more` : ''}
                </p>
              </>
            )}
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
