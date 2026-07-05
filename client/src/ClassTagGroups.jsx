// Clickable class tags organized by grouping — shared by the filter popup
// and the new-player popup. `onSetGroup` is optional; when given, each group
// header gets an all/none toggle.
export default function ClassTagGroups({ groups, classes, selected, onToggle, onSetGroup }) {
  return groups.map(group => {
    const allOn = group.classes.every(c => selected.has(c))
    return (
      <div key={group.name} className="filter-group">
        <div className="filter-group-name">
          {group.name}
          {onSetGroup && (
            <button className="mini" onClick={() => onSetGroup(group, !allOn)}>
              {allOn ? 'none' : 'all'}
            </button>
          )}
        </div>
        <div className="filter-tags">
          {group.classes.map(c => (
            <button
              key={c}
              className={`class-tag filter-tag ${selected.has(c) ? 'on' : ''}`}
              style={{ background: classes[c]?.color || '#666' }}
              title={classes[c]?.label || c}
              onClick={() => onToggle(c)}
            >
              {classes[c]?.short || c}
            </button>
          ))}
        </div>
      </div>
    )
  })
}
