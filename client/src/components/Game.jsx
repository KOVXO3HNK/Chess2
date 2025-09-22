import React, { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { io } from 'socket.io-client'
import { Howl } from 'howler'

const socket = io() // тот же домен
const files = ['a','b','c','d','e','f','g','h']
const glyph = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚', P:'♙', R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔' }

export default function Game() {
  const [chess] = useState(() => new Chess())
  const [fen, setFen] = useState(() => chess.fen())
  const [selected, setSelected] = useState(null)
  const [legalTargets, setLegalTargets] = useState(new Set())
  const [moves, setMoves] = useState([])
  const [result, setResult] = useState(null)

  const moveSound = useRef(null)
  const checkSound = useRef(null)
  useEffect(() => {
    moveSound.current = new Howl({ src: ['/sounds/move.mp3'] })
    checkSound.current = new Howl({ src: ['/sounds/check.mp3'] })
  }, [])

  // приём хода соперника (если играете через комнаты)
  useEffect(() => {
    function onOpp({ move, fen }) {
      chess.move(move)
      setFen(fen)
      setMoves(m => [...m, move.san])
      setSelected(null)
      setLegalTargets(new Set())
      moveSound.current?.play()
      checkEnd()
    }
    socket.on('opponentMove', onOpp)
    return () => socket.off('opponentMove', onOpp)
  }, [chess])

  function onSquareClick(sq) {
    // если не выбрано — пытаемся выбрать свою фигуру
    if (!selected) {
      const piece = chess.get(sq)
      if (!piece || piece.color !== chess.turn()) return
      setSelected(sq)
      const ms = chess.moves({ square: sq, verbose: true })
      setLegalTargets(new Set(ms.map(m => m.to)))
      return
    }

    // повторный клик — снять
    if (sq === selected) {
      setSelected(null)
      setLegalTargets(new Set())
      return
    }

    // клик по своей другой фигуре — перевыбор
    const targetPiece = chess.get(sq)
    if (targetPiece && targetPiece.color === chess.turn()) {
      setSelected(sq)
      const ms = chess.moves({ square: sq, verbose: true })
      setLegalTargets(new Set(ms.map(m => m.to)))
      return
    }

    // попытка хода
    const res = chess.move({ from: selected, to: sq, promotion: 'q' })
    if (res) {
      setFen(chess.fen())
      setMoves(m => [...m, res.san])
      setSelected(null)
      setLegalTargets(new Set())
      socket.emit('move', { roomId: 'room-1', move: res, fen: chess.fen() }) // если нужно
      moveSound.current?.play()
      checkEnd()
    } else {
      // невалидно — снять
      setSelected(null)
      setLegalTargets(new Set())
    }
  }

  function checkEnd() {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'black' : 'white'
      setResult({ label: 'Мат', winner })
    } else if (chess.isStalemate()) {
      setResult({ label: 'Пат', winner: 'draw' })
    } else if (chess.isDraw()) {
      setResult({ label: 'Ничья', winner: 'draw' })
    } else if (chess.inCheck()) {
      checkSound.current?.play()
    }
  }

  function reset() {
    chess.reset()
    setFen(chess.fen())
    setMoves([])
    setSelected(null)
    setLegalTargets(new Set())
    setResult(null)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'min-content 1fr', gap:24 }}>
      <Board fen={fen} onSquareClick={onSquareClick} selected={selected} legalTargets={legalTargets} />
      <div>
        <h3>Ходы</h3>
        <ol>{moves.map((m, i) => <li key={i}>{m}</li>)}</ol>
        <button className="btn" onClick={reset}>Новая партия</button>
      </div>

      {result && (
        <div className="modal">
          <div className="modal-card">
            <h3>{result.label}</h3>
            <p>Победитель: <b>
              {result.winner === 'draw' ? 'ничья' : (result.winner === 'white' ? 'Белые' : 'Чёрные')}
            </b></p>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" onClick={reset}>Реванш</button>
              <button className="btn outline" onClick={()=>setResult(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Board({ fen, onSquareClick, selected, legalTargets }) {
  const board = fen.split(' ')[0]
  const rows = board.split('/')
  const grid = []
  for (let r = 0; r < 8; r++) {
    const row = []
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) row.push(...Array(parseInt(ch,10)).fill(' '))
      else row.push(ch)
    }
    grid.push(row)
  }
  const sq = (r,c) => `${files[c]}${8-r}`

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 64px)', gridTemplateRows:'repeat(8, 64px)', border:'2px solid #333' }}>
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const dark = (r+c)%2===1
          const square = sq(r,c)
          const isSel = selected === square
          const canGo = legalTargets && legalTargets.has(square)

          let bg = dark ? '#769656' : '#eeeed2'
          if (isSel) bg = '#ffe08a'
          else if (canGo) bg = dark ? '#a9d18e' : '#c7e6b5'

          return (
            <div key={square}
              onClick={() => onSquareClick(square)}
              style={{
                width:64,height:64,display:'grid',placeItems:'center',
                cursor:'pointer', background:bg, fontSize:34, position:'relative'
              }}>
              <span>{glyph[cell] || ''}</span>
              {canGo && !glyph[cell] && <span style={{
                width:12,height:12,borderRadius:'50%',background:'#0006',position:'absolute'
              }} />}
            </div>
          )
        })
      )}
    </div>
  )
}
