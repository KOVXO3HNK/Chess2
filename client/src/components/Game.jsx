import React, { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { socket } from './Lobby.jsx'
import AiWorker from '../engine/ai-worker.js?worker' // если у тебя stockfish-worker — замени импорт на него

const files = ['a','b','c','d','e','f','g','h']

export default function Game({ user }) {
  const [chess] = useState(() => new Chess())
  const [fen, setFen] = useState(() => chess.fen())
  const [ai, setAi] = useState('off') // off | easy | mid | hard
  const [side, setSide] = useState('w')
  const [selected, setSelected] = useState(null)
  const [moves, setMoves] = useState([])
  const [legalTargets, setLegalTargets] = useState(new Set()) // подсветка доступных клеток
  const workerRef = useRef(null)

  // инициализация воркера ИИ
  useEffect(() => {
    workerRef.current = new AiWorker()
    return () => workerRef.current?.terminate()
  }, [])

  // обработка хода соперника (мультиплеер)
  useEffect(() => {
    function onOppMove({ move, fen }) {
      chess.move(move)
      setFen(fen)
      setMoves((m) => [...m, move.san])
      setSelected(null)
      setLegalTargets(new Set())
    }
    socket.on('opponentMove', onOppMove)
    return () => socket.off('opponentMove', onOppMove)
  }, [chess])

  // улучшенная логика клика по клетке
  function onSquareClick(sq) {
    // если ещё ничего не выбрано — пытаемся выбрать фигуру на клетке
    if (!selected) {
      const piece = chess.get(sq)
      if (!piece) return // клик по пустой клетке — игнор
      // разрешим выбирать только фигуры текущего игрока
      if (piece.color !== chess.turn()) return
      setSelected(sq)
      const ms = chess.moves({ square: sq, verbose: true })
      setLegalTargets(new Set(ms.map((m) => m.to)))
      return
    }

    // повторный клик по той же клетке — снять выделение
    if (sq === selected) {
      setSelected(null)
      setLegalTargets(new Set())
      return
    }

    // клик по своей другой фигуре — перевыбор
    const clicked = chess.get(sq)
    if (clicked && clicked.color === chess.turn()) {
      setSelected(sq)
      const ms = chess.moves({ square: sq, verbose: true })
      setLegalTargets(new Set(ms.map((m) => m.to)))
      return
    }

    // попытка сделать ход
    const move = { from: selected, to: sq, promotion: 'q' }
    const result = chess.move(move)
    if (result) {
      setFen(chess.fen())
      setMoves((m) => [...m, result.san])
      socket.emit('move', { roomId: 'room-1', move: result, fen: chess.fen() })
      setSelected(null)
      setLegalTargets(new Set())
      if (ai !== 'off' && chess.turn() !== side) aiMove()
    } else {
      // невалидный ход — снять выделение
      setSelected(null)
      setLegalTargets(new Set())
    }
  }

  function aiMove() {
    if (!workerRef.current) return
    const skill = ai === 'easy' ? 4 : ai === 'mid' ? 12 : 20
    workerRef.current.onmessage = (e) => {
      if (typeof e.data === 'string' && e.data.startsWith('bestmove')) {
        const parts = e.data.split(' ')
        const uci = parts[1]
        if (!uci || uci.length < 4) return
        const from = uci.slice(0, 2)
        const to = uci.slice(2, 4)
        const promo = uci.slice(4, 5) || 'q'
        const m = chess.move({ from, to, promotion: promo })
        if (m) {
          setFen(chess.fen())
          setMoves((x) => [...x, m.san])
        }
      }
    }
    workerRef.current.postMessage('uci')
    workerRef.current.postMessage('ucinewgame')
    workerRef.current.postMessage(`setoption name Skill Level value ${skill}`)
    workerRef.current.postMessage(`position fen ${chess.fen()}`)
    workerRef.current.postMessage('go movetime 500')
  }

  function reset() {
    chess.reset()
    setFen(chess.fen())
    setMoves([])
    setSelected(null)
    setLegalTargets(new Set())
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: 16 }}>
      <div>
        <Board
          fen={fen}
          onSquareClick={onSquareClick}
          selected={selected}
          legalTargets={legalTargets}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>
            AI:&nbsp;
            <select value={ai} onChange={(e) => setAi(e.target.value)}>
              <option value="off">Off</option>
              <option value="easy">Beginner</option>
              <option value="mid">Intermediate</option>
              <option value="hard">Grandmaster</option>
            </select>
          </label>
          <button onClick={reset}>Новая партия</button>
        </div>
      </div>
      <div>
        <h3>Ходы</h3>
        <ol>{moves.map((m, i) => <li key={i}>{m}</li>)}</ol>
      </div>
    </div>
  )
}

function Board({ fen, onSquareClick, selected, legalTargets }) {
  const pieceChars = {
    p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
    P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
  }

  // раскладываем FEN в матрицу 8x8
  const boardPart = fen.split(' ')[0]
  const rows = boardPart.split('/')
  const grid = []
  for (let r = 0; r < 8; r++) {
    const row = []
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) row.push(...Array(parseInt(ch, 10)).fill(' '))
      else row.push(ch)
    }
    grid.push(row)
  }

  const sq = (r, c) => `${files[c]}${8 - r}`

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 48px)',
      gridTemplateRows: 'repeat(8, 48px)',
      border: '2px solid #333'
    }}>
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const dark = (r + c) % 2 === 1
          const square = sq(r, c)
          const isSel = selected === square
          const canGo = legalTargets && legalTargets.has(square)

          let bg = dark ? '#769656' : '#eeeed2'
          if (isSel) bg = '#ffe08a'
          else if (canGo) bg = dark ? '#a9d18e' : '#c7e6b5'

          return (
            <div
              key={square}
              onClick={() => onSquareClick(square)}
              style={{
                width: 48, height: 48, display: 'grid', placeItems: 'center',
                cursor: 'pointer', background: bg, fontSize: 28, position: 'relative'
              }}
            >
              <span>{pieceChars[cell] || ''}</span>
              {/* точка в центре для хода на пустую клетку */}
              {canGo && !pieceChars[cell] && (
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#0006', position: 'absolute'
                }} />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
