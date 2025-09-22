import React, { useEffect, useState } from 'react'

export default function Leaderboard() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { if (d.ok) setRows(d.rows) })
  }, [])

  return (
    <div className="card">
      <div className="card-header"><strong>Лидерборд</strong></div>
      <table className="tbl">
        <thead>
          <tr><th>#</th><th>Игрок</th><th>Рейтинг</th><th>Игр</th><th>W</th><th>D</th><th>L</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>{r.username || r.id}</td>
              <td>{r.rating}</td>
              <td>{r.games}</td>
              <td>{r.wins}</td>
              <td>{r.draws}</td>
              <td>{r.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
