// client/src/engine/ai-worker.js
// Лёгкий ИИ на базе minimax + эвристика материала.
// Эмулирует протокол Stockfish: понимает "position fen ..." и "go movetime ...",
// отвечает строкой "bestmove e2e4".

import { Chess } from 'chess.js'

let currentFEN = new Chess().fen()
let skillDepth = 2 // по умолчанию

// Простая ценность фигур
const PIECE_VALUES = { p:100, n:320, b:330, r:500, q:900, k:20000 }

function evaluateBoard(chess) {
  // материал + лёгкий бонус за мобильность
  const board = chess.board()
  let score = 0
  for (const row of board) {
    for (const s of row) {
      if (!s) continue
      const val = PIECE_VALUES[s.type] || 0
      score += s.color === 'w' ? val : -val
    }
  }
  // мобильность
  const mobility = chess.moves().length
  chess.turn() === 'w' ? (score += mobility) : (score -= mobility)
  return score
}

function orderMoves(chess, moves) {
  // сначала взятия — ускоряет поиск
  return moves.sort((a,b)=>{
    const ca = /x/.test(a) ? 1 : 0
    const cb = /x/.test(b) ? 1 : 0
    return cb - ca
  })
}

function bestMoveFor(chess, depth) {
  let best = null
  let bestScore = -Infinity

  const moves = orderMoves(chess, chess.moves())
  for (const m of moves) {
    chess.move(m)
    const score = -negamax(chess, depth-1, -Infinity, Infinity)
    chess.undo()
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

function negamax(chess, depth, alpha, beta) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess)
  }
  let max = -Infinity
  const moves = orderMoves(chess, chess.moves())
  for (const m of moves) {
    chess.move(m)
    const val = -negamax(chess, depth-1, -beta, -alpha)
    chess.undo()
    if (val > max) max = val
    if (val > alpha) alpha = val
    if (alpha >= beta) break
  }
  return max
}

function sanToUci(chess, sanMove) {
  // chess.js умеет вернуть ласт-ход с from/to/promotion
  const last = chess.history({ verbose: true }).slice(-1)[0]
  if (!last) return null
  const promo = last.promotion ? last.promotion : ''
  return `${last.from}${last.to}${promo}`
}

onmessage = (e) => {
  const msg = e.data
  if (typeof msg !== 'string') return

  if (msg.startsWith('setoption name Skill Level value ')) {
    const v = parseInt(msg.replace('setoption name Skill Level value ', ''), 10)
    // маппинг “уровня” в глубину
    if (v <= 5) skillDepth = 1
    else if (v <= 12) skillDepth = 2
    else skillDepth = 3
    return
  }

  if (msg.startsWith('position fen ')) {
    currentFEN = msg.replace('position fen ', '').trim()
    return
  }

  if (msg.startsWith('ucinewgame') || msg.startsWith('uci')) {
    // ничего не делаем — совместимость
    return
  }

  if (msg.startsWith('go ')) {
    const chess = new Chess(currentFEN)
    // ищем лучший ход
    const san = bestMoveFor(chess, skillDepth) // возвращает SAN
    if (!san) {
      postMessage('bestmove (none)')
      return
    }
    // применяем, чтобы получить from/to/promotion
    chess.move(san)
    const uci = sanToUci(chess, san)
    postMessage(`bestmove ${uci}`)
    return
  }
}
