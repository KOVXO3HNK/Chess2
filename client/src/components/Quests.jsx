import React, { useEffect, useState } from 'react'

export default function Quests() {
  const [quests,setQuests] = useState([])

  useEffect(()=>{
    fetch('/api/quests').then(r=>r.json()).then(d=>{
      if(d.ok) setQuests(d.quests)
    })
  },[])

  return (
    <div>
      <h2>Квесты</h2>
      <ul>
        {quests.map(q=><li key={q.id}>{q.title}</li>)}
      </ul>
    </div>
  )
}
