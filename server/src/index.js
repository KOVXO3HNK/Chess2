import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

import { initDb, upsertPlayer, getPlayer, setPlayerRating, leaderboard } from './db.js'
import { elo } from './elo.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server) // same-origin

app.use(express.json())

// ---------- API ----------
app.get('/healthz', (_, res) => res.send('ok'))

app.get('/api/leaderboard', async (_, res) => {
  const rows = await leaderboard(50)
  res.json({ ok: true, rows })
})

app.get('/api/profile/:id', async (req, res) => {
  const p = await getPlayer(req.params.id)
  res.json({ ok: true, player: p || null })
})

app.post('/api/player/init', async (req, res) => {
  const { id, username } = req.body || {}
  if (!id) return res.status(400).json({ ok: false, error: 'no id' })
  await upsertPlayer(String(id), username || null)
  const p = await getPlayer(String(id))
  res.json({ ok: true, player: p })
})

app.post('/api/match/result', async (req, res) => {
  const { whiteId, blackId, result } = req.body || {}
  if (!whiteId || !blackId || !result) return res.status(400).json({ ok: false, error: 'bad payload' })

  const w = (await getPlayer(String(whiteId))) || { rating: 1200 }
  const b = (await getPlayer(String(blackId))) || { rating: 1200 }

  const scoreA = result === 'white' ? 1 : result === 'draw' ? 0.5 : 0
  const [rW, rB] = elo(w.rating, b.rating, scoreA)

  await setPlayerRating(String(whiteId), rW, result === 'white' ? 'win' : result === 'black' ? 'loss' : 'draw')
  await setPlayerRating(String(blackId), rB, result === 'black' ? 'win' : result === 'white' ? 'loss' : 'draw')

  res.json({ ok: true, white: { from: w.rating, to: rW }, black: { from: b.rating, to: rB } })
})

// ---------- Socket.IO ----------
const queue = [] // [{socketId, userId}]

io.on('connection', (socket) => {
  // быстрый матчмейкинг
  socket.on('queue.join', ({ userId }) => {
    queue.push({ socketId: socket.id, userId })
    tryMatch()
  })
  socket.on('queue.leave', () => {
    const i = queue.findIndex(q => q.socketId === socket.id)
    if (i >= 0) queue.splice(i, 1)
  })
  socket.on('disconnect', () => {
    const i = queue.findIndex(q => q.socketId === socket.id)
    if (i >= 0) queue.splice(i, 1)
  })

  // комнатная логика (если используешь)
  socket.on('createRoom', ({ roomId }) => socket.join(roomId))
  socket.on('joinRoom', ({ roomId }) => socket.join(roomId))
  socket.on('move', ({ roomId, move, fen }) => socket.to(roomId).emit('opponentMove', { move, fen }))
})

function tryMatch() {
  while (queue.length >= 2) {
    const a = queue.shift()
    const b = queue.shift()
    const roomId = 'm_' + Math.random().toString(36).slice(2, 8)
    io.to(a.socketId).emit('match.found', { roomId, color: 'w', oppId: b.userId })
    io.to(b.socketId).emit('match.found', { roomId, color: 'b', oppId: a.userId })
  }
}

// ---------- Static (Render копирует dist в server/public) ----------
app.use(express.static(path.join(__dirname, '..', 'public')))
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

// ---------- Start ----------
const PORT = process.env.PORT || 10000
await initDb().catch((e) => console.error('DB init error', e))
server.listen(PORT, () => console.log('Server on http://localhost:' + PORT))
