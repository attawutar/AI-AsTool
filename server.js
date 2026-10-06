const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
require('./questions')(io);

// ─── In-memory room store ───────────────────────────────────────────────────
const rooms = new Map();
const polls = new Map();       // pollCode → { hostId, question, options, votes, voters, active }
const scoreboards = new Map(); // sbCode  → { hostId, teams: [{name, score}] }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on('create-room', (callback) => {
    let roomCode, attempts = 0;
    do { roomCode = generateRoomCode(); attempts++; }
    while (rooms.has(roomCode) && attempts < 100);

    const room = {
      code: roomCode,
      hostId: socket.id,
      participants: [],
      groups: null,
      numGroups: 2,
      createdAt: Date.now(),
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.isHost = true;

    console.log(`[Room] Created: ${roomCode}`);
    callback({ success: true, roomCode });
  });

  socket.on('join-room', ({ roomCode, name }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) return callback({ success: false, error: 'Room not found. Check the code and try again.' });
    if (!name || !name.trim()) return callback({ success: false, error: 'Name cannot be empty.' });

    const already = room.participants.find(p => p.id === socket.id);
    if (!already) room.participants.push({ id: socket.id, name: name.trim() });

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.participantName = name.trim();

    console.log(`[Room] ${name} joined ${code} (${room.participants.length} total)`);

    io.to(code).emit('room-update', { participants: room.participants, groups: room.groups });

    if (room.groups) {
      const myGroupIndex = room.groups.findIndex(g => g.members.some(m => m.id === socket.id));
      callback({ success: true, groups: room.groups, myGroupIndex });
    } else {
      callback({ success: true });
    }
  });

  socket.on('set-num-groups', ({ numGroups }) => {
    const room = rooms.get(socket.data.roomCode);
    if (room && room.hostId === socket.id) {
      room.numGroups = Math.max(2, Math.min(numGroups, room.participants.length || 2));
    }
  });

  socket.on('randomize-groups', (callback) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return callback?.({ success: false, error: 'Room not found.' });
    if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only the host can randomize.' });

    const shuffled = shuffle(room.participants);
    const n = room.numGroups || 2;
    const groups = Array.from({ length: n }, (_, i) => ({ name: `Group ${i + 1}`, members: [] }));
    shuffled.forEach((p, i) => groups[i % n].members.push(p));
    room.groups = groups;

    console.log(`[Room] ${room.code} randomized into ${n} groups`);
    io.to(room.code).emit('groups-randomized', { groups });
    callback?.({ success: true, groups });
  });

  socket.on('reset-groups', () => {
    const room = rooms.get(socket.data.roomCode);
    if (room && room.hostId === socket.id) {
      room.groups = null;
      io.to(room.code).emit('room-update', { participants: room.participants, groups: null });
    }
  });

  socket.on('disconnect', () => {
    const { roomCode, isHost, participantName } = socket.data || {};
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    if (isHost) {
      console.log(`[Room] Host left ${roomCode} — closing`);
      io.to(roomCode).emit('host-left');
      rooms.delete(roomCode);
    } else {
      room.participants = room.participants.filter(p => p.id !== socket.id);
      console.log(`[-] ${participantName} left ${roomCode}`);
      io.to(roomCode).emit('room-update', { participants: room.participants, groups: room.groups });
    }
  });

  // ─── Poll events ─────────────────────────────────────────────────────────
  socket.on('create-poll', ({ question, options }, cb) => {
    if (!question?.trim() || !Array.isArray(options) || options.length < 2)
      return cb?.({ success: false, error: 'Need a question and at least 2 options' });
    let code, tries = 0;
    do { code = generateRoomCode(); tries++; } while (polls.has(code) && tries < 100);
    const opts = options.map(o => o.trim()).filter(Boolean);
    const poll = { code, hostId: socket.id, question: question.trim(), options: opts, votes: new Array(opts.length).fill(0), voters: new Set(), active: true };
    polls.set(code, poll);
    socket.join('poll_' + code);
    socket.data.pollCode = code;
    console.log(`[Poll] Created: ${code}`);
    cb?.({ success: true, code });
  });

  socket.on('join-poll', ({ code }, cb) => {
    const poll = polls.get((code || '').toUpperCase());
    if (!poll) return cb?.({ success: false, error: 'Poll not found' });
    if (!poll.active) return cb?.({ success: false, error: 'Poll has ended' });
    socket.join('poll_' + poll.code);
    cb?.({ success: true, question: poll.question, options: poll.options, votes: poll.votes, voted: poll.voters.has(socket.id), total: poll.voters.size });
  });

  socket.on('submit-vote', ({ code, optionIndex }, cb) => {
    const poll = polls.get((code || '').toUpperCase());
    if (!poll || !poll.active) return cb?.({ success: false, error: 'Poll not available' });
    if (poll.voters.has(socket.id)) return cb?.({ success: false, error: 'Already voted' });
    if (optionIndex < 0 || optionIndex >= poll.options.length) return cb?.({ success: false });
    poll.votes[optionIndex]++;
    poll.voters.add(socket.id);
    io.to('poll_' + poll.code).emit('poll-update', { votes: poll.votes, total: poll.voters.size });
    cb?.({ success: true });
  });

  socket.on('reset-poll', ({ code }) => {
    const poll = polls.get(code);
    if (!poll || poll.hostId !== socket.id) return;
    poll.votes = new Array(poll.options.length).fill(0);
    poll.voters.clear();
    poll.active = true;
    io.to('poll_' + code).emit('poll-update', { votes: poll.votes, total: 0 });
  });

  socket.on('end-poll', ({ code }) => {
    const poll = polls.get(code);
    if (!poll || poll.hostId !== socket.id) return;
    poll.active = false;
    io.to('poll_' + code).emit('poll-ended');
  });

  // ─── Scoreboard events ───────────────────────────────────────────────────
  socket.on('create-scoreboard', ({ teams }, cb) => {
    if (!Array.isArray(teams) || !teams.length) return cb?.({ success: false });
    let code, tries = 0;
    do { code = generateRoomCode(); tries++; } while (scoreboards.has(code) && tries < 100);
    const sb = { code, hostId: socket.id, teams: teams.filter(Boolean).map(name => ({ name: name.trim(), score: 0 })) };
    scoreboards.set(code, sb);
    socket.join('sb_' + code);
    socket.data.sbCode = code;
    console.log(`[Scoreboard] Created: ${code}`);
    cb?.({ success: true, code, teams: sb.teams });
  });

  socket.on('join-scoreboard', ({ code }, cb) => {
    const sb = scoreboards.get((code || '').toUpperCase());
    if (!sb) return cb?.({ success: false, error: 'Scoreboard not found' });
    socket.join('sb_' + sb.code);
    cb?.({ success: true, teams: sb.teams });
  });

  socket.on('update-score', ({ code, teamIndex, delta }) => {
    const sb = scoreboards.get(code);
    if (!sb || sb.hostId !== socket.id) return;
    if (teamIndex < 0 || teamIndex >= sb.teams.length) return;
    sb.teams[teamIndex].score = Math.max(0, sb.teams[teamIndex].score + delta);
    io.to('sb_' + code).emit('scoreboard-update', { teams: sb.teams });
  });

  socket.on('reset-scoreboard', ({ code }) => {
    const sb = scoreboards.get(code);
    if (!sb || sb.hostId !== socket.id) return;
    sb.teams.forEach(t => t.score = 0);
    io.to('sb_' + code).emit('scoreboard-update', { teams: sb.teams });
  });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff) {
      io.to(code).emit('host-left');
      rooms.delete(code);
      console.log(`[Room] Stale room ${code} purged`);
    }
  }
}, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Hello AI server on port ${PORT}`));
