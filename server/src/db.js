import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT,
      rating INTEGER NOT NULL DEFAULT 1200,
      games INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

export async function upsertPlayer(id, username) {
  await pool.query(
    `INSERT INTO players (id, username)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET username = COALESCE($2, players.username), updated_at = now()`,
    [id, username]
  )
}

export async function getPlayer(id) {
  const { rows } = await pool.query(`SELECT * FROM players WHERE id = $1`, [id])
  return rows[0]
}

export async function setPlayerRating(id, newRating, outcome) {
  const col =
    outcome === 'win' ? 'wins' :
    outcome === 'loss' ? 'losses' : 'draws'
  await pool.query(
    `INSERT INTO players (id, rating, games, ${col})
     VALUES ($1, $2, 1, 1)
     ON CONFLICT (id) DO UPDATE
     SET rating = $2,
         games = players.games + 1,
         ${col} = players.${col} + 1,
         updated_at = now()`,
    [id, Math.round(newRating)]
  )
}

export async function leaderboard(limit = 50) {
  const { rows } = await pool.query(
    `SELECT id, username, rating, games, wins, draws, losses
     FROM players
     ORDER BY rating DESC
     LIMIT $1`,
    [limit]
  )
  return rows
}
