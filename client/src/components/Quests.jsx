import React, { useEffect, useState } from 'react'

export default function Quests({ user }) {
  const [quests, setQuests] = useState([])
  const [progress, setProgress] = useState({})

  useEffect(()=>{
    fetch((import.meta.env.VITE_SERVER_URL || 'http://localhost:8080') + '/api/quests')
      .then(r=>r.json()).then(d=>{ if(d.ok) setQuests(d.quests)})
  },[])

  function toggle(q) {
    const key = user?.id ? String(user.id) : 'guest'
    const body = { userId: key, questId: q.id, done: !progress[q.id] }
    fetch((import.meta.env.VITE_SERVER_URL || 'http://localhost:8080') + '/api/quests/progress', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(r=>r.json()).then(d=>{
      if (d.ok) setProgress(prev => ({...prev, [q.id]: !prev[q.id]}))
    })
  }

  return (
    <div style={{border:'1px solid #ccc', padding:10, borderRadius:8, marginTop:12}}>
      <h2>Квесты (20)</h2>
      <ul>
        {quests.map(q=>
          <li key={q.id} style={{margin:'6px 0'}}>
            <label>
              <input type="checkbox" checked={!!progress[q.id]} onChange={()=>toggle(q)} />
              <strong style={{marginLeft:8}}>{q.title}</strong> — <span style={{opacity:0.7}}>{q.hint}</span>
            </label>
          </li>
        )}
      </ul>
    </div>
  )
}
