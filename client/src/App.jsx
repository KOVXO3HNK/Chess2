import React, { useEffect, useState } from 'react'
import Game from './components/Game.jsx'
import Lobby from './components/Lobby.jsx'
import Quests from './components/Quests.jsx'

export default function App() {
  const [initData, setInitData] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.expand()
      setInitData(tg.initData || '')
      try {
        const u = tg.initDataUnsafe?.user
        if (u) setUser({ id: u.id, name: u.username || (u.first_name + ' ' + (u.last_name||''))})
      } catch(e){}
    }
  }, [])

  return (
    <div style={{fontFamily:'system-ui, sans-serif', padding:12}}>
      <h1>♟ Telegram Chess</h1>
      <p>Игрок: {user?.name || 'Гость'}</p>
      <Lobby />
      <Game user={user} initData={initData} />
      <Quests user={user} />
      <footer style={{marginTop:20, opacity:0.7}}>v1.0</footer>
    </div>
  )
}
