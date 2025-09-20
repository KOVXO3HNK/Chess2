# Telegram Chess Web App (AI + Quests + Multiplayer)

A complete web application you can publish as a Telegram Mini App (Web App):
- ✅ Chess engine with **three AI levels** (Beginner/Intermediate/Grandmaster) powered by Stockfish (WASM).
- ✅ **20 quests** with progress tracking.
- ✅ **Real-time multiplayer** via Socket.IO (create/join rooms, move sync, chat, resign/draw).
- ✅ Telegram WebApp integration (theme, user auth via `initData`).

## Monorepo structure
```
chess_telegram_webapp/
  client/        # Vite + React frontend, Telegram WebApp SDK, chess.js, stockfish.wasm in a Web Worker
  server/        # Node.js + Express + Socket.IO + Telegraf bot for launching the WebApp
```

## Quick start (local dev)
1) Create bot: talk to @BotFather → get **BOT_TOKEN**.
2) In `server/.env` set:
```
BOT_TOKEN=123456:ABC-DEF...
PORT=8080
WEBAPP_URL=http://localhost:5173
```

3) Install & run:
```bash
# in /server
npm i
npm run dev

# in /client
npm i
npm run dev
```

4) In Telegram, send `/start` to your bot. It will show a **Open Chess Web App** button.

## Production deploy (one of many options)
- Deploy `server` on a VPS / Render / Railway / Fly.io (expose HTTPS).
- Deploy `client` to Vercel/Netlify and set `WEBAPP_URL` to the public URL.
- Set a Telegram **webhook** (Telegraf can use long polling or webhook).

## Notes
- AI engine via `@stockfish/stockfish-wasm` in a Web Worker (keeps UI smooth).
- Multiplayer is in-memory by default. For scale, point `IO_REDIS_URL` in `.env` and use `socket.io-redis-adapter` (code stubbed).
- Quest progress: if Telegram `initData` is verified on the server, we store by `telegram_user_id`; else fallback to localStorage.
