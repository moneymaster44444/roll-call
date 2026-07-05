// Renders the sheet to a canvas styled like the guild's spreadsheet
// (white background, black grid, bold colored name + class label) and
// triggers a PNG download.
export function exportPng({ title, columns, partyCount, grid, members, classes }) {
  const SCALE = 2 // render at 2x for crispness in Discord
  const labelW = 74
  const cellW = 172
  const cellH = 54
  const titleH = title ? 44 : 0
  const pad = 1

  const width = labelW + columns.length * cellW + pad * 2
  const height = titleH + partyCount * cellH + pad * 2

  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  if (title) {
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 20px Arial'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, pad + 8, titleH / 2 + 2)
  }

  const gridTop = titleH + pad
  const gridLeft = pad
  const byId = new Map(members.map(m => [m.id, m]))

  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1

  for (let r = 0; r < partyCount; r++) {
    const y = gridTop + r * cellH

    ctx.strokeRect(gridLeft, y, labelW, cellH)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 14px Arial'
    ctx.textBaseline = 'middle'
    ctx.fillText('Party', gridLeft + 8, y + cellH / 2 - 9)
    ctx.fillText(String(r + 1), gridLeft + 8, y + cellH / 2 + 9)

    columns.forEach((col, c) => {
      const x = gridLeft + labelW + c * cellW
      ctx.strokeRect(x, y, cellW, cellH)
      const a = grid[`${r}:${col.id}`]
      if (!a) return
      const member = byId.get(a.memberId)
      const cls = classes[a.cls]
      const color = cls?.color || '#000000'
      const name = member?.name || '?'
      const label = cls?.label || a.cls || ''
      ctx.fillStyle = color
      ctx.font = 'bold 15px Arial'
      ctx.fillText(truncate(ctx, name, cellW - 14), x + 7, y + cellH / 2 - 10)
      if (label) {
        ctx.font = '13px Arial'
        ctx.fillText(truncate(ctx, label, cellW - 14), x + 7, y + cellH / 2 + 11)
      }
    })
  }

  canvas.toBlob((blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rollcall-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
