const http = require('http');
const os = require('os');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const { ROOMS, cleanUsername, isValidRoom, buildMessage } = require('./utils');

const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'chatdb';
const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || '50', 10);
const APP_VERSION = require('../package.json').version;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let messages = null; // MongoDB collection, set once connected
const online = new Map(); // socket.id -> { username, room }

async function connectMongo() {
  try {
    const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    messages = client.db(DB_NAME).collection('messages');
    await messages.createIndex({ room: 1, createdAt: -1 });
    console.log(`[db] connected to ${MONGO_URL}, database "${DB_NAME}"`);
  } catch (err) {
    console.error(`[db] connection failed (${err.message}), retrying in 5s`);
    setTimeout(connectMongo, 5000);
  }
}

async function loadHistory(room) {
  if (!messages) return [];
  const docs = await messages
    .find({ room }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .toArray();
  return docs.reverse();
}

function usersIn(room) {
  return [...online.values()].filter((u) => u.room === room).map((u) => u.username).sort();
}

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: messages ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/api/info', (req, res) => {
  res.json({ app: 'real-time-chat-app', version: APP_VERSION, host: os.hostname(), rooms: ROOMS });
});

app.get('/api/stats', async (req, res) => {
  const stored = messages ? await messages.countDocuments() : null;
  res.json({ onlineUsers: online.size, storedMessages: stored, host: os.hostname() });
});

io.on('connection', (socket) => {
  socket.on('join', async ({ username, room }, ack) => {
    const name = cleanUsername(username);
    if (!name) return ack && ack({ ok: false, error: 'Name must be 2-20 letters, digits, spaces, . _ or -' });
    if (!isValidRoom(room)) return ack && ack({ ok: false, error: 'Unknown room' });

    const previous = online.get(socket.id);
    if (previous) {
      socket.leave(previous.room);
      socket.to(previous.room).emit('system', `${previous.username} left the room`);
      io.to(previous.room).emit('users', usersIn(previous.room).filter((u) => u !== previous.username));
    }

    online.set(socket.id, { username: name, room });
    socket.join(room);
    const history = await loadHistory(room).catch(() => []);
    if (ack) ack({ ok: true, username: name, room, history, host: os.hostname() });
    socket.to(room).emit('system', `${name} joined #${room}`);
    io.to(room).emit('users', usersIn(room));
  });

  socket.on('message', async (text) => {
    const user = online.get(socket.id);
    if (!user) return;
    const msg = buildMessage(user.username, user.room, text);
    if (!msg) return;
    io.to(user.room).emit('message', msg);
    if (messages) {
      messages.insertOne({ ...msg }).catch((err) => console.error('[db] insert failed:', err.message));
    }
  });

  socket.on('typing', (isTyping) => {
    const user = online.get(socket.id);
    if (user) socket.to(user.room).emit('typing', { username: user.username, isTyping: !!isTyping });
  });

  socket.on('disconnect', () => {
    const user = online.get(socket.id);
    if (!user) return;
    online.delete(socket.id);
    socket.to(user.room).emit('system', `${user.username} left the room`);
    io.to(user.room).emit('users', usersIn(user.room));
  });
});

if (require.main === module) {
  connectMongo();
  server.listen(PORT, () => console.log(`[app] real-time-chat-app v${APP_VERSION} listening on port ${PORT} (host ${os.hostname()})`));
}

module.exports = { app, server };
