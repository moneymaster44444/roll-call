const API = 'https://discord.com/api/v10'

async function dget(path, token) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API + path, {
      headers: { Authorization: `Bot ${token}` }
    })
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}))
      await new Promise(r => setTimeout(r, (body.retry_after || 1) * 1000 + 100))
      continue
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const err = new Error(body.message || `Discord API error ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.json()
  }
  const err = new Error('Discord is rate-limiting us. Wait a minute and try again.')
  err.status = 429
  throw err
}

export function parseMessageLinks(input) {
  const links = [...(input || '').matchAll(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/g)]
    .map(m => ({ guildId: m[1], channelId: m[2], messageId: m[3] }))
  const seen = new Set()
  const unique = links.filter(l => !seen.has(l.messageId) && seen.add(l.messageId))
  if (unique.length === 0) {
    const err = new Error('That does not look like a Discord message link. In Discord, right-click the FIRST signup post and choose "Copy Message Link", then paste it here.')
    err.status = 400
    throw err
  }
  return unique
}

// Signups often span several consecutive posts (Discord caps reactions per
// message). Given the first post, pull the messages that follow it in the
// channel and keep the ones by the same author posted within an hour.
const FOLLOWUP_WINDOW_MS = 60 * 60 * 1000

async function discoverFollowups(anchor, channelId, token) {
  let after = []
  try {
    after = await dget(`/channels/${channelId}/messages?after=${anchor.id}&limit=50`, token)
  } catch {
    return [] // listing denied? fall back to just the linked post
  }
  const anchorTs = Date.parse(anchor.timestamp)
  return after
    .filter(m => m.author?.id === anchor.author?.id)
    .filter(m => Date.parse(m.timestamp) - anchorTs < FOLLOWUP_WINDOW_MS)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
}

// Each signup post is one class grouping: the post's text is the group name
// ("Main Support Classes", …) and its reactions are the group's classes.
// Emojis written inside the text also count, as a fallback. Posts whose
// reactions contain no known classes (e.g. the attendance post) are skipped.
function buildGroups(messages, knownClasses) {
  const groups = []
  for (const msg of messages) {
    const classNames = []
    const add = (n) => { if (knownClasses.has(n) && !classNames.includes(n)) classNames.push(n) }
    for (const r of msg.reactions || []) {
      if (r.emoji?.name) add(r.emoji.name)
    }
    for (const m of (msg.content || '').matchAll(/<a?:(\w+):\d+>/g)) add(m[1])
    if (classNames.length === 0) continue

    const nameLine = (msg.content || '').split('\n')
      .map(l => l.replace(/<a?:\w+:\d+>/g, '').replace(/[*_~`#>|]/g, '').trim())
      .find(l => l.length > 0)
    const name = (nameLine || '').replace(/:+\s*$/, '').trim() || `Group ${groups.length + 1}`
    groups.push({ name, classes: classNames })
  }
  return groups
}

export async function fetchRoster(link, token, cfg) {
  const targets = parseMessageLinks(link)
  const { guildId, channelId } = targets[0]

  const messages = []
  for (const t of targets) {
    try {
      messages.push(await dget(`/channels/${t.channelId}/messages/${t.messageId}`, token))
    } catch (e) {
      if (e.status === 403 || e.status === 404) {
        throw new Error('Could not read that message. Make sure the bot has been invited to the server and can see that channel (View Channels + Read Message History).')
      }
      throw e
    }
  }
  // Single link pasted: auto-discover the leader's follow-up posts.
  if (targets.length === 1) {
    messages.push(...await discoverFollowups(messages[0], channelId, token))
  }

  const yesSet = new Set(cfg.attendance?.yes || [])
  const maybeSet = new Set(cfg.attendance?.maybe || [])
  const knownClasses = new Set(Object.keys(cfg.classes || {}))

  const members = new Map()
  const unmapped = []
  const ensure = (u) => {
    if (!members.has(u.id)) {
      members.set(u.id, {
        id: u.id,
        name: u.global_name || u.username,
        classes: [],
        attendance: null
      })
    }
    return members.get(u.id)
  }

  for (const message of messages) {
    for (const r of message.reactions || []) {
      const name = r.emoji.name
      const isYes = yesSet.has(name)
      const isMaybe = maybeSet.has(name)
      const isClass = knownClasses.has(name)
      if (!isYes && !isMaybe && !isClass) {
        unmapped.push(name)
        continue
      }
      const emojiKey = r.emoji.id ? `${name}:${r.emoji.id}` : name
      let after
      while (true) {
        const page = await dget(
          `/channels/${channelId}/messages/${message.id}/reactions/${encodeURIComponent(emojiKey)}?limit=100${after ? `&after=${after}` : ''}`,
          token
        )
        for (const u of page) {
          if (u.bot) continue
          const m = ensure(u)
          if (isClass && !m.classes.includes(name)) m.classes.push(name)
          if (isYes) m.attendance = 'yes'
          if (isMaybe && m.attendance !== 'yes') m.attendance = 'maybe'
        }
        if (page.length < 100) break
        after = page[page.length - 1].id
      }
    }
  }

  // Resolve server nicknames (a few at a time to stay under rate limits).
  const list = [...members.values()]
  const CHUNK = 5
  for (let i = 0; i < list.length; i += CHUNK) {
    await Promise.all(list.slice(i, i + CHUNK).map(async (m) => {
      try {
        const gm = await dget(`/guilds/${guildId}/members/${m.id}`, token)
        m.name = gm.nick || gm.user?.global_name || m.name
      } catch {
        // Member left the server or is not visible — keep the username we have.
      }
    }))
  }

  list.sort((a, b) => a.name.localeCompare(b.name))
  return {
    members: list,
    groups: buildGroups(messages, knownClasses),
    unmappedEmojis: [...new Set(unmapped)],
    postsScanned: messages.length,
    fetchedAt: new Date().toISOString()
  }
}
