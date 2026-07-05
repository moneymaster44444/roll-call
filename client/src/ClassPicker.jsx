export default function ClassPicker({ member, column, classes, onPick, onCancel }) {
  if (!member) return null
  const signed = member.classes
  const fits = signed.filter(c => column?.allowed.includes(c))
  const other = signed.filter(c => !column?.allowed.includes(c))
  const rest = Object.keys(classes).filter(c => !signed.includes(c))

  const Row = ({ c }) => (
    <button className="picker-row" onClick={() => onPick(c)}>
      <span className="class-tag" style={{ background: classes[c]?.color || '#666' }}>
        {classes[c]?.short || c}
      </span>
      {classes[c]?.label || c}
    </button>
  )

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="picker" onClick={e => e.stopPropagation()}>
        <h3>{member.name} — pick a class for “{column?.name}”</h3>
        {fits.length > 0 && (
          <>
            <div className="picker-group">Signed up &amp; fits this column</div>
            {fits.map(c => <Row key={c} c={c} />)}
          </>
        )}
        {other.length > 0 && (
          <>
            <div className="picker-group">Signed up (other role)</div>
            {other.map(c => <Row key={c} c={c} />)}
          </>
        )}
        <details>
          <summary>Any other class (override)</summary>
          {rest.map(c => <Row key={c} c={c} />)}
        </details>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
