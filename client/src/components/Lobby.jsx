import React, { useState } from 'react'
import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:8080')

export default function Lobby() {
  const [roomId, setRoomId] = useState('room-1')
  const [state, setState] = useState({ players: 0 })
  const [messages, setMessages] = useState([])

  socket.on('roomState', (s) => setState(s))
  socket.on('roomFull', () => alert('Комната заполнена'))
  socket.on('roomMissing', () => alert('Комната не существует'))

  return (
    <div style={{border:'1px solid #ccc', padding:10, borderRadius:8, marginBottom:12}}>
      <h2>Мультиплеер</h2>
      <input value={roomId} onChange={e=>setRoomId(e.target.value)} placeholder="room id"/>
      <button onClick={()=>socket.emit('createRoom', {roomId})}>Создать</button>
      <button onClick={()=>socket.emit('joinRoom', {roomId})}>Войти</button>
      <span style={{marginLeft:8}}>Игроков: {state.players}</span>
    </div>
  )
}

export { socket }
