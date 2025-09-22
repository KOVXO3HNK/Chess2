import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT,
      rating INT NOT NULL DEFAULT 1200,
      games INT NOT NULL DEFAULT 0,
      wins INT NOT NULL DEFAULT 0,
      losses INT NOT NULL DEFAULT 0,
      draws INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS players_rating_idx ON players(rating DESC);
  `)
}

export async function upsertPlayer(id, username) {
  await pool.query(`
    INSERT INTO players (id, username) VALUES ($1,$2)
    ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, updated_at = NOW()
  `, [id, username || null])
}

export async function getPlayer(id) {
  const { rows } = await pool.query(`SELECT * FROM players WHERE id=$1`, [id])
  return rows[0]
}

export async function setPlayerRating(id, rating, result) {
  const col = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws'
  await pool.query(`
    UPDATE players SET rating=$2, games=games+1, ${col}=${col}+1, updated_at=NOW()
    WHERE id=$1
  `, [id, rating])
}

export async function leaderboard(limit=50) {
  const { rows } = await pool.query(`SELECT id, username, rating, games, wins, losses, draws
                                     FROM players ORDER BY rating DESC LIMIT $1`, [limit])
  return rows
}

export async function close() { await pool.end() }
