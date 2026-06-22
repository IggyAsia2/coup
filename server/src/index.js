const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { GameEngine } = require('./game/GameEngine');

const app = express();
const httpServer = createServer(app);

// Serve React build trong production
const publicDir = path.join(__dirname, '../../public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// rooms: { [code]: { engine, hostId } }
const rooms = {};

function genCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function broadcast(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  room.engine.getAllConnected().forEach(person => {
    const sock = io.sockets.sockets.get(person.id);
    if (sock) sock.emit('state-update', room.engine.getStateFor(person.id));
  });
}

io.on('connection', socket => {
  let roomCode = null;

  socket.on('create-room', ({ playerName, persistentId }, cb) => {
    const code = genCode();
    const engine = new GameEngine();
    engine.addPlayer(socket.id, playerName, persistentId);
    rooms[code] = { engine, hostId: persistentId };
    roomCode = code;
    socket.join(code);
    cb({ roomCode: code, gameState: engine.getStateFor(socket.id) });
  });

  socket.on('join-room', ({ roomCode: code, playerName, persistentId }, cb) => {
    const room = rooms[code];
    if (!room) return cb({ error: 'Không tìm thấy phòng' });
    const result = room.engine.addPlayer(socket.id, playerName, persistentId);
    if (result.error) return cb(result);
    roomCode = code;
    socket.join(code);
    broadcast(roomCode);
    cb({ gameState: room.engine.getStateFor(socket.id), isSpectator: result.spectator });
  });

  socket.on('rejoin-room', ({ roomCode: code, persistentId }, cb) => {
    const room = rooms[code];
    if (!room) return cb({ error: 'Phòng không còn tồn tại' });
    const result = room.engine.rejoinPlayer(socket.id, persistentId);
    if (result.error) return cb(result);
    roomCode = code;
    socket.join(code);
    const isHost = room.hostId === persistentId;
    broadcast(roomCode);
    cb({ gameState: room.engine.getStateFor(socket.id), isHost });
  });

  socket.on('start-game', (_, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const me = room.engine.players.find(p => p.id === socket.id);
    if (room.hostId !== me?.persistentId) return cb?.({ error: 'Only host can start' });
    const result = room.engine.startGame();
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('take-action', ({ actionType, targetId }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const result = room.engine.takeAction(socket.id, actionType, targetId);
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('challenge', (_, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const result = room.engine.challenge(socket.id);
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('block', ({ claimedCharacter }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const result = room.engine.block(socket.id, claimedCharacter);
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('pass', (_, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const result = room.engine.pass(socket.id);
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('lose-influence', ({ cardIndex }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const result = room.engine.loseInfluence(socket.id, cardIndex);
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('exchange-select', ({ selectedIndices }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const result = room.engine.exchangeSelect(socket.id, selectedIndices);
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('restart-game', (_, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ error: 'Not in a room' });
    const me = room.engine.players.find(p => p.id === socket.id);
    if (room.hostId !== me?.persistentId) return cb?.({ error: 'Only host can restart' });
    room.engine.restartGame();
    const result = room.engine.startGame();
    if (result.error) return cb?.(result);
    broadcast(roomCode);
    cb?.({ ok: true });
  });

  socket.on('leave-room', (_, cb) => {
    if (roomCode && rooms[roomCode]) {
      const engine = rooms[roomCode].engine
      engine.removePlayer(socket.id)
      engine.spectators = engine.spectators.filter(s => s.id !== socket.id)
      broadcast(roomCode)
      if (engine.getAllConnected().length === 0) delete rooms[roomCode]
    }
    roomCode = null
    cb?.({ ok: true })
  })

  socket.on('disconnect', () => {
    if (roomCode && rooms[roomCode]) {
      rooms[roomCode].engine.removePlayer(socket.id);
      broadcast(roomCode);
      // Clean up empty rooms
      if (rooms[roomCode].engine.players.length === 0) {
        delete rooms[roomCode];
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Coup server on http://localhost:${PORT}`));
