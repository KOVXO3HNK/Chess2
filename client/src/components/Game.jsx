import React, { useState, useRef, useEffect } from 'react'
import { Howl } from 'howler'
import { Chess } from 'chess.js'
import Chessboard from 'chessboardjsx'

export default function Game() {
  const [fen, setFen] = useState('start')
  const [chess] = useState(new Chess())
  const [result, setResult] = useState(null)

  const moveSound = useRef(null)
  const checkSound = useRef(null)

  useEffect(() => {
    moveSound.current = new Howl({ src: ['/sounds/move.mp3'] })
    checkSound.current = new Howl({ src: ['/sounds/check.mp3'] })
  }, [])

  function onDrop({ sourceSquare, targetSquare }) {
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    if (move) {
      setFen(chess.fen())
      moveSound.current?.play()
      checkEnd()
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
    setFen('start')
    setResult(null)
  }

  return (
    <div>
      <Chessboard width={400} position={fen} onDrop={onDrop} />
      {result && (
        <div className="modal">
          <div className="modal-card">
            <h3>{result.label}</h3>
            <p>Победитель: <b>{result.winner === 'draw' ? 'Ничья' : (result.winner === 'white' ? 'Белые' : 'Чёрные')}</b></p>
            <button className="btn" onClick={reset}>Реванш</button>
          </div>
        </div>
      )}
    </div>
  )
}
