import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import { Telegraf, Markup } from 'telegraf';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});

const PORT = process.env.PORT || 8080;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// --- Simple memory stores ---
const rooms = new Map(); // roomId -> { players: [socketId], fen, moves[], chat[] }
const userQuestProgress = new Map(); // userId -> { questId: boolean, ... }

// Verify Telegram initData (optional minimal check)
function verifyTelegramInitData(initData) {
  // For production: implement full hash check described in Telegram docs.
  // Here we accept presence.
  return typeof initData === 'string' && initData.length > 0;
}

// JWT for webapp sessions (optional convenience)
app.post('/api/auth/telegram', (req, res) => {
  const { initData } = req.body;
  if (!verifyTelegramInitData(initData)) {
    return res.status(400).json({ ok: false, error: 'Invalid initData' });
  }
  // Parse user id naively (unsafe demo). Replace with proper verification.
  let userId = 'guest';
  try {
    const params = new URLSearchParams(initData);
    const raw = params.get('user');
    if (raw) {
      const obj = JSON.parse(raw);
      userId = String(obj.id);
    }
  } catch (e) {}
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token, userId });
});

// --- Quests API ---
app.get('/api/quests', (req, res) => {
  const sample = [
    { id: 'Q1',  title: 'Победа в игре', hint: 'Выиграйте любую партию.' },
    { id: 'Q2',  title: 'Мат за 30 ходов', hint: 'Завершите партию до 30-го хода.' },
    { id: 'Q3',  title: 'Пешка в ферзи', hint: 'Сделайте промоцию пешки.' },
    { id: 'Q4',  title: 'Взятие на проходе', hint: 'Сделайте en passant.' },
    { id: 'Q5',  title: 'Рокировка', hint: 'Сделайте рокировку.' },
    { id: 'Q6',  title: 'Дебют итальянской партии', hint: 'Сыграйте e4 e5 Nf3 Nc6 Bc4.' },
    { id: 'Q7',  title: 'Слон и конь', hint: 'Срубите фигуры слоном и конём в одной партии.' },
    { id: 'Q8',  title: 'Двойной удар', hint: 'Сделайте вилку конём.' },
    { id: 'Q9',  title: 'Ловушка ферзя', hint: 'Выиграйте ферзя соперника.' },
    { id: 'Q10', title: 'Шах каждый ход', hint: 'Дайте 3 шаха подряд.' },
    { id: 'Q11', title: 'Мат ладьёй', hint: 'Поставьте мат с участием ладьи.' },
    { id: 'Q12', title: 'Мат слоном', hint: 'Поставьте мат, где решающую роль играет слон.' },
    { id: 'Q13', title: 'Мат конём', hint: 'Поставьте мат, где решающую роль играет конь.' },
    { id: 'Q14', title: 'Мат пешкой', hint: 'Поставьте мат пешкой.' },
    { id: 'Q15', title: 'Мат с последней горизонтали', hint: 'Мат по 8(1) горизонтали.' },
    { id: 'Q16', title: 'Поймай короля', hint: 'Загоните короля на край доски и матуйте.' },
    { id: 'Q17', title: 'Спаси короля', hint: 'Выжить под вечным шахом (ничья).'},
    { id: 'Q18', title: 'Сделка о ничьей', hint: 'Закончите партию вничью по согласию.' },
    { id: 'Q19', title: 'Серия побед', hint: 'Выиграйте 2 партии подряд.' },
    { id: 'Q20', title: 'Чистая партия', hint: 'Победите, не потеряв фигуру (кроме пешек).' },
  ];
  res.json({ ok: true, quests: sample });
});

app.post('/api/quests/progress', (req, res) => {
  const { userId, questId, done } = req.body;
  if (!userId || !questId) return res.status(400).json({ ok:false });
  const p = userQuestProgress.get(userId) || {};
  p[questId] = !!done;
  userQuestProgress.set(userId, p);
  res.json({ ok:true, progress: p });
});

// --- Multiplayer (Socket.IO) ---
io.on('connection', (socket) => {
  socket.on('createRoom', ({ roomId }) => {
    if (!rooms.has(roomId)) rooms.set(roomId, { players: [], fen: null, moves: [], chat: [] });
    const r = rooms.get(roomId);
    if (r.players.length >= 2) return socket.emit('roomFull');
    r.players.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomState', { players: r.players.length });
  });

  socket.on('joinRoom', ({ roomId }) => {
    if (!rooms.has(roomId)) return socket.emit('roomMissing');
    const r = rooms.get(roomId);
    if (r.players.length >= 2) return socket.emit('roomFull');
    r.players.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('roomState', { players: r.players.length });
  });

  socket.on('move', ({ roomId, move, fen }) => {
    if (!rooms.has(roomId)) return;
    const r = rooms.get(roomId);
    r.fen = fen;
    r.moves.push(move);
    socket.to(roomId).emit('opponentMove', { move, fen });
  });

  socket.on('chat', ({ roomId, text }) => {
    if (!rooms.has(roomId)) return;
    rooms.get(roomId).chat.push({ id: socket.id, text });
    socket.to(roomId).emit('chat', { id: socket.id, text });
  });

  socket.on('resign', ({ roomId }) => {
    socket.to(roomId).emit('opponentResigned');
  });

  socket.on('offerDraw', ({ roomId }) => {
    socket.to(roomId).emit('offerDraw');
  });

  socket.on('disconnect', () => {
    for (const [roomId, r] of rooms) {
      const idx = r.players.indexOf(socket.id);
      if (idx !== -1) {
        r.players.splice(idx, 1);
        io.to(roomId).emit('roomState', { players: r.players.length });
      }
    }
  });
});

// --- Bot (Telegraf) ---
if (!BOT_TOKEN) {
  console.warn('BOT_TOKEN is not set. Bot will not start.');
} else {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    return ctx.reply('Готовы поиграть в шахматы?', Markup.inlineKeyboard([
      Markup.button.webApp('Открыть Chess Web App', WEBAPP_URL)
    ]));
  });

  // Optional: /menu to re-send the button
  bot.command('menu', (ctx) => {
    return ctx.reply('Открыть приложение:', Markup.inlineKeyboard([
      Markup.button.webApp('Chess Web App', WEBAPP_URL)
    ]));
  });

  bot.launch().then(() => console.log('Telegraf bot started'));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

server.listen(PORT, () => {
  console.log('Server on http://localhost:' + PORT);
});
