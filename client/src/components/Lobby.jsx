import React, { useState } from 'react'
import { io } from 'socket.io-client'

const socket = io()

export default function Lobby() {
  const [roomId, setRoomId] = useState('room-1')
  const [state, setState] = useState({ players: 0 })

  socket.on('roomState', (s) => setState(s))

  return (
    <div>
      <h2>Мультиплеер</h2>
      <input value={roomId} onChange={e=>setRoomId(e.target.value)} />
      <button onClick={()=>socket.emit('createRoom',{roomId})}>Создать</button>
      <button onClick={()=>socket.emit('joinRoom',{roomId})}>Войти</button>
      <span>Игроков: {state.players}</span>
    </div>
  )
}

export { socket }
