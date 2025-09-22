import React, { useEffect, useState } from 'react'

export default function Quests({ user }) {
  const [quests, setQuests] = useState([])
  const [progress, setProgress] = useState({})
  const uid = user?.id ? String(user.id) : 'guest'

  useEffect(() => {
    // Заглушка: можно заменить на API
    setQuests([
      { id: 1, title: 'Сыграй 1 партию', hint: 'Разомнись!' },
      { id: 2, title: 'Выиграй 3 партии', hint: 'Пора показать силу' },
      { id: 3, title: 'Сыграй с другом', hint: 'Пригласи соперника' }
    ])
  }, [])

  function toggle(q) {
    setProgress(p => ({ ...p, [q.id]: !p[q.id] }))
  }

  const done = Object.values(progress).filter(Boolean).length

  return (
    <div className="card">
      <div className="card-header">
        <strong>Квесты</strong>
        <span className="muted"> {done}/{quests.length}</span>
        <div className="bar"><div className="bar-in" style={{ width: `${(done / Math.max(quests.length, 1)) * 100}%` }} /></div>
      </div>
      <ul className="list">
        {quests.map(q => (
          <li key={q.id} className="row">
            <label>
              <input type="checkbox" checked={!!progress[q.id]} onChange={() => toggle(q)} />
              <span className="qtitle">{q.title}</span>
              <span className="muted"> — {q.hint}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
