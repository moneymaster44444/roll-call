import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchRoster } from './discord.js'
import { mockRoster } from './mock.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const app = express()
app.use(express.json())

// Config files are read per-request so edits apply without restarting the server.
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
}

app.get('/api/config', (req, res) => {
  try {
    res.json({
      classes: readJson('config/classes.json'),
      columns: readJson('config/columns.json')
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to read config files: ' + e.message })
  }
})

app.post('/api/roster', async (req, res) => {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token || token === 'paste-your-bot-token-here') {
    return res.status(400).json({
      error: 'No bot token configured. Open the .env file, paste your DISCORD_BOT_TOKEN, then restart the app (close the window and run start.bat again).'
    })
  }
  try {
    const cfg = readJson('config/classes.json')
    const roster = await fetchRoster(req.body.link, token, cfg)
    res.json(roster)
  } catch (e) {
    res.status(e.status === 400 ? 400 : 502).json({ error: e.message })
  }
})

app.get('/api/mock', (req, res) => {
  res.json(mockRoster())
})

function writeJson(rel, data) {
  fs.writeFileSync(path.join(root, rel), JSON.stringify(data, null, 2) + '\n')
}

app.post('/api/config/classes', (req, res) => {
  try {
    const { attendance, classes, renames } = req.body
    if (!classes || typeof classes !== 'object' || Object.keys(classes).length === 0) {
      return res.status(400).json({ error: 'At least one class is required.' })
    }
    const current = readJson('config/classes.json')
    writeJson('config/classes.json', {
      _comment: current._comment,
      attendance: { yes: attendance?.yes || [], maybe: attendance?.maybe || [] },
      classes
    })
    // Renamed emoji keys must stay in sync with the default columns file.
    if (renames && Object.keys(renames).length > 0) {
      const cols = readJson('config/columns.json')
      cols.columns = (cols.columns || []).map(c => ({
        ...c,
        allowed: (c.allowed || []).map(a => renames[a] || a)
      }))
      writeJson('config/columns.json', cols)
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Failed to save classes config: ' + e.message })
  }
})

app.post('/api/config/columns', (req, res) => {
  try {
    const { parties, columns } = req.body
    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: 'At least one column is required.' })
    }
    const current = readJson('config/columns.json')
    writeJson('config/columns.json', {
      _comment: current._comment,
      parties: Math.max(1, Math.min(15, Number(parties) || 5)),
      columns: columns.map(c => ({ id: c.id, name: c.name, allowed: c.allowed }))
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Failed to save columns config: ' + e.message })
  }
})

app.use(express.static(path.join(root, 'dist')))

const port = process.env.PORT || 3117
app.listen(port, () => {
  console.log(`RollCall is running. Open http://localhost:${port} in your browser.`)
})
