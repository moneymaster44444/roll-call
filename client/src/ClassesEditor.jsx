import { useState } from 'react'

// Form-based editor for the class config — emoji↔class mapping, the Yes/Maybe
// attendance emoji names, and each class's role grouping. Saving writes the
// file on disk; renamed emoji keys are propagated to columns and the current
// sheet by the caller.
export default function ClassesEditor({ classes, attendance, groups, onSave, onCancel }) {
  const [yes, setYes] = useState((attendance?.yes || []).join(', '))
  const [maybe, setMaybe] = useState((attendance?.maybe || []).join(', '))

  // Role choices: every known grouping (scraped and configured) + Unknown.
  const roleOptions = [...new Set([
    ...(groups || []).map(g => g.name),
    ...Object.values(classes).map(c => c.role?.trim()).filter(Boolean),
    'Unknown'
  ])]
  const groupOf = (key) => (groups || []).find(g => g.classes.includes(key))?.name

  const [rows, setRows] = useState(Object.entries(classes).map(([key, c]) => ({
    origKey: key, key,
    label: c.label || '', short: c.short || '', color: c.color || '#888888',
    role: c.role?.trim() || groupOf(key) || 'Unknown'
  })))
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const update = (i, patch) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows(rs => [...rs, { origKey: null, key: '', label: '', short: '', color: '#888888', role: 'Unknown' }])
  const removeRow = (i) => setRows(rs => rs.filter((_, idx) => idx !== i))

  const cleanEmoji = (s) => s.trim().replace(/^:+|:+$/g, '')

  async function save() {
    const keys = rows.map(r => cleanEmoji(r.key))
    if (keys.some(k => !k)) return setError('Every class needs an emoji name (the text between colons).')
    if (new Set(keys).size !== keys.length) return setError('Emoji names must be unique.')

    const classesOut = {}
    const renames = {}
    rows.forEach((r, i) => {
      const key = keys[i]
      classesOut[key] = {
        label: r.label.trim() || key,
        short: r.short.trim() || key.slice(0, 5),
        color: r.color,
        role: r.role || 'Unknown'
      }
      if (r.origKey && r.origKey !== key) renames[r.origKey] = key
    })
    const att = {
      yes: yes.split(',').map(cleanEmoji).filter(Boolean),
      maybe: maybe.split(',').map(cleanEmoji).filter(Boolean)
    }
    setSaving(true)
    const err = await onSave({ classes: classesOut, attendance: att, renames })
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="picker editor" onClick={e => e.stopPropagation()}>
        <h3>Edit classes</h3>
        <p className="hint">
          Emoji names must match the Discord server&apos;s emoji names exactly — the text
          between the colons, e.g. <code>Support_Luminary</code> for :Support_Luminary:.
        </p>

        <div className="editor-att">
          <label>
            &quot;Yes, joining&quot; emoji name(s), comma-separated
            <input type="text" value={yes} onChange={e => setYes(e.target.value)} placeholder="Pika_cookie" />
          </label>
          <label>
            &quot;Maybe&quot; emoji name(s), comma-separated
            <input type="text" value={maybe} onChange={e => setMaybe(e.target.value)} placeholder="Pika_wtfDidYouSay" />
          </label>
        </div>

        <div className="editor-head">
          <span className="col-key">Emoji name</span>
          <span className="col-label">Class label (on sheet)</span>
          <span className="col-short">Tag</span>
          <span className="col-color">Color</span>
          <span className="col-role">Role</span>
          <span className="col-x" />
        </div>
        <div className="editor-rows">
          {rows.map((r, i) => (
            <div key={i} className="editor-row">
              <input className="col-key" type="text" value={r.key}
                onChange={e => update(i, { key: e.target.value })} placeholder="DPS_Berserker" />
              <input className="col-label" type="text" value={r.label}
                onChange={e => update(i, { label: e.target.value })} placeholder="DPS Berserker" />
              <input className="col-short" type="text" value={r.short} maxLength={6}
                onChange={e => update(i, { short: e.target.value })} placeholder="Bers" />
              <input className="col-color" type="color" value={r.color}
                onChange={e => update(i, { color: e.target.value })} title="Color used on the sheet" />
              <select className="col-role" value={r.role} title="Grouping this class belongs to"
                onChange={e => update(i, { role: e.target.value })}>
                {roleOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button className="mini danger col-x" title="Remove class" onClick={() => removeRow(i)}>×</button>
            </div>
          ))}
        </div>
        <button className="btn small" onClick={addRow}>+ Add class</button>

        {error && <div className="banner error">{error}</div>}
        <div className="confirm-actions">
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
