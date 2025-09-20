import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { socket } from './Lobby.jsx'
import AiWorker from '../engine/ai-worker.js?worker'

const SQUARES = []
const files = ['a','b','c','d','e','f','g','h']
for (let r=8; r>=1; r--) for (let f=0; f<8; f++) SQUARES.push(files[f]+r)

export default function Game({ user }) {
  const [chess] = useState(()=> new Chess())
  const [fen, setFen] = useState(chess.fen())
  const [ai, setAi] = useState('off') // off | easy | mid | hard
  const [side, setSide] = useState('w')
  const [selected, setSelected] = useState(null)
  const [moves, setMoves] = useState([])
  const workerRef = useRef(null)

  useEffect(() => {
    workerRef.current = new AiWorker()
    return () => workerRef.current?.terminate()
  }, [])

  useEffect(() => {
    socket.on('opponentMove', ({ move, fen }) => {
      chess.move(move)
      setFen(fen)
      setMoves(m=>[...m, move.san])
    })
    return () => {
      socket.off('opponentMove')
    }
  }, [chess])

  function onSquareClick(sq) {
    if (selected) {
      const move = { from: selected, to: sq, promotion: 'q' }
      const result = chess.move(move)
      if (result) {
        setFen(chess.fen())
        setMoves(m=>[...m, result.san])
        socket.emit('move', { roomId: 'room-1', move: result, fen: chess.fen() })
        if (ai !== 'off' && chess.turn() !== side) aiMove()
      }
      setSelected(null)
    } else {
      setSelected(sq)
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
        const from = uci.slice(0,2)
        const to = uci.slice(2,4)
        const promo = uci.slice(4,5) || 'q'
        const m = chess.move({ from, to, promotion: promo })
        if (m) {
          setFen(chess.fen())
          setMoves(x=>[...x, m.san])
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
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'min-content 1fr', gap:16}}>
      <div>
        <Board fen={fen} onSquareClick={onSquareClick} selected={selected} />
        <div style={{marginTop:8, display:'flex', gap:8}}>
          <label>AI:&nbsp;
            <select value={ai} onChange={e=>setAi(e.target.value)}>
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
        <ol>{moves.map((m,i)=><li key={i}>{m}</li>)}</ol>
      </div>
    </div>
  )
}

function Board({ fen, onSquareClick, selected }) {
  // Simple FEN renderer using piece letters → emoji (compact demo)
  const [placement] = useState(()=>{
    return {}
  })
  const board = fen.split(' ')[0]
  let idx = 0
  const grid = []
  const rows = board.split('/')
  for (let r=0;r<8;r++) {
    const row = []
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) {
        const n = parseInt(ch,10)
        for (let i=0;i<n;i++) row.push(' ')
      } else {
        row.push(ch)
      }
    }
    grid.push(row)
  }
  const pieces = {
    'p':'♟','r':'♜','n':'♞','b':'♝','q':'♛','k':'♚',
    'P':'♙','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔'
  }
  function sq(r,c){
    const files = ['a','b','c','d','e','f','g','h']
    return files[c]+(8-r)
  }
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(8, 48px)', gridTemplateRows:'repeat(8, 48px)', border:'2px solid #333'}}>
      {grid.map((row,r)=>
        row.map((cell,c)=>{
          const dark = (r+c)%2===1
          const square = sq(r,c)
          const isSel = selected === square
          return (
            <div key={square} onClick={()=>onSquareClick(square)}
              style={{ width:48, height:48, display:'grid', placeItems:'center', cursor:'pointer',
                background: isSel ? '#ffe08a' : (dark ? '#769656' : '#eeeed2'), fontSize:28 }}>
              <span>{pieces[cell] || ''}</span>
            </div>
          )
        })
      )}
    </div>
  )
}
