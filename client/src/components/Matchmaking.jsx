import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const mm = io()

export default function Matchmaking({ user, onFound }) {
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const h = ({ roomId, color, oppId }) => {
      setSearching(false)
      onFound?.({ roomId, color, oppId })
    }
    mm.on('match.found', h)
    return () => mm.off('match.found', h)
  }, [onFound])

  function find() {
    setSearching(true)
    const id = user?.id || ('guest:' + Math.random().toString(36).slice(2,6))
    mm.emit('queue.join', { userId: id })
  }
  function cancel() {
    setSearching(false)
    mm.emit('queue.leave')
  }

  return (
    <div className="card">
      <div className="card-header"><strong>Быстрый матч</strong></div>
      {!searching
        ? <button className="btn" onClick={find}>Найти соперника</button>
        : <button className="btn outline" onClick={cancel}>Отменить поиск…</button>}
    </div>
  )
}
