// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5000;
const MONGODB_URI = "mongodb+srv://subhashkujhuria5558_db_user:Ywvjtk95zXIdtpGb@cluster0.3bcvs3w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const JWT_SECRET = "uY7$kd9sPQw!zX@4eF1#Lm8H&Tr3nBv0xZaR6WqTjN2oLg";

app.use(cors());
app.use(bodyParser.json());

// ================== MongoDB ==================
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB connected'))
.catch(e => console.log(e));

// ================== User Schema ==================
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  passwordHash: String,
  roles: [String],
  balance: Number,
  chips: Number,
  isBlocked: Boolean,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// ================== Auth Middleware ==================
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ================== Routes ==================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, passwordHash } = req.body;
    const user = new User({ username, email, passwordHash, roles: ['user'], balance: 0, chips: 0, isBlocked: false });
    await user.save();
    res.json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ message: 'Registration error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, passwordHash } = req.body;
    const user = await User.findOne({ email, passwordHash });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isBlocked) return res.status(403).json({ message: 'User blocked' });
    const token = jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, username: user.username, roles: user.roles, balance: user.balance, chips: user.chips });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ username: user.username, balance: user.balance, chips: user.chips, roles: user.roles });
  } catch (err) {
    res.status(500).json({ message: 'Profile fetch error' });
  }
});

app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: 'Forbidden' });
  const users = await User.find();
  res.json(users);
});

// ================== Live Rooms + Games ==================
let liveRooms = {
  room1: { id: 'room1', name: 'VIP Room 1', seats: Array(8).fill(null), lockedSeats: new Set(), owner: null }
};

// Dragon Tiger
let dragonTigerGame = {
  currentRound: 0,
  dragonCard: null,
  tigerCard: null,
  bettingOpen: false,
  bets: {} // userId -> { dragon, tiger, tie }
};

// Fishing Master
let fishingMasterGame = {
  players: {},
  bossAppeared: false,
  fishCaught: 0,
  bettingOpen: false,
  bets: {} // userId -> amount
};

// ================== Socket.io ==================
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);

  // ---------- Live Rooms ----------
  socket.on('joinRoom', ({ roomId, userId }) => {
    const room = liveRooms[roomId];
    if (!room) return;
    let seatIndex = room.seats.findIndex(s => s === null);
    if (seatIndex === -1) {
      socket.emit('roomFull', roomId);
      return;
    }
    room.seats[seatIndex] = userId;
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', room);
    socket.data = { roomId, seatIndex, userId };
  });

  socket.on('leaveRoom', () => {
    const { roomId, seatIndex } = socket.data || {};
    if (!roomId || seatIndex === undefined) return;
    const room = liveRooms[roomId];
    if (!room) return;
    room.seats[seatIndex] = null;
    socket.leave(roomId);
    io.to(roomId).emit('roomUpdate', room);
  });

  socket.on('toggleMic', ({ roomId, seatIndex, micOn }) => {
    io.to(roomId).emit('micToggled', { seatIndex, micOn });
  });

  socket.on('lockSeats', ({ roomId, lock }) => {
    const room = liveRooms[roomId];
    if (!room) return;
    if (lock) room.lockedSeats = new Set([...Array(8).keys()]);
    else room.lockedSeats.clear();
    io.to(roomId).emit('roomUpdate', room);
  });

  // ---------- Dragon Tiger ----------
  socket.on('placeBet', ({ userId, side, amount }) => {
    if (!dragonTigerGame.bettingOpen) {
      socket.emit('betRejected', 'Betting closed');
      return;
    }
    if (!dragonTigerGame.bets[userId]) dragonTigerGame.bets[userId] = { dragon: 0, tiger: 0, tie: 0 };
    dragonTigerGame.bets[userId][side] += amount;
    io.emit('betPlaced', { userId, side, amount });
  });

  socket.on('openBetting', () => {
    dragonTigerGame.bettingOpen = true;
    dragonTigerGame.bets = {};
    io.emit('bettingStatus', 'open');
  });

  socket.on('closeBetting', () => {
    dragonTigerGame.bettingOpen = false;
    dragonTigerGame.dragonCard = drawCard();
    dragonTigerGame.tigerCard = drawCard();
    const winner = decideWinner(dragonTigerGame.dragonCard, dragonTigerGame.tigerCard);
    const payouts = calculatePayouts(dragonTigerGame.bets, winner);
    io.emit('bettingStatus', 'closed');
    io.emit('roundResult', { dragonCard: dragonTigerGame.dragonCard, tigerCard: dragonTigerGame.tigerCard, winner, payouts });
  });

  // ---------- Fishing Master ----------
  socket.on('fishingPlaceBet', ({ userId, amount }) => {
    if (!fishingMasterGame.bettingOpen) {
      socket.emit('fishBetRejected', 'Betting closed');
      return;
    }
    if (!fishingMasterGame.bets[userId]) fishingMasterGame.bets[userId] = 0;
    fishingMasterGame.bets[userId] += amount;
    io.emit('fishBetPlaced', { userId, amount });
  });

  socket.on('startFishing', () => {
    fishingMasterGame.bettingOpen = true;
    fishingMasterGame.bets = {};
    io.emit('fishingStatus', 'start');
  });

  socket.on('endFishing', () => {
    fishingMasterGame.bettingOpen = false;
    fishingMasterGame.bossAppeared = true;
    io.emit('fishingStatus', 'boss_appeared');
    setTimeout(() => {
      fishingMasterGame.bossAppeared = false;
      const payouts = calculateFishingPayouts(fishingMasterGame.bets);
      io.emit('fishingRoundResult', { payouts, fishCaught: fishingMasterGame.fishCaught });
      fishingMasterGame.fishCaught = 0;
    }, 30000);
  });

  socket.on('fishCaught', ({ userId }) => {
    fishingMasterGame.fishCaught++;
    io.emit('fishCaughtUpdate', fishingMasterGame.fishCaught);
  });

  // ---------- Disconnect ----------
  socket.on('disconnect', () => {
    const { roomId, seatIndex } = socket.data || {};
    if (roomId !== undefined && seatIndex !== undefined) {
      const room = liveRooms[roomId];
      if (room) {
        room.seats[seatIndex] = null;
        io.to(roomId).emit('roomUpdate', room);
      }
    }
    console.log('Socket disconnected:', socket.id);
  });
});

// ================== Helper Functions ==================
function drawCard() {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['♠', '♥', '♦', '♣'];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { rank, suit };
}

function decideWinner(dCard, tCard) {
  const rankValue = (rank) => {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank);
  };
  const dVal = rankValue(dCard.rank);
  const tVal = rankValue(tCard.rank);
  if (dVal > tVal) return 'dragon';
  if (tVal > dVal) return 'tiger';
  return 'tie';
}

function calculatePayouts(bets, winner) {
  let payouts = {};
  for (const userId in bets) {
    const bet = bets[userId];
    payouts[userId] = 0;
    if (winner === 'tie' && bet.tie > 0) payouts[userId] += bet.tie * 8;
    if (winner !== 'tie' && bet[winner] > 0) payouts[userId] += bet[winner] * 2;
  }
  return payouts;
}

function calculateFishingPayouts(bets) {
  let payouts = {};
  for (const userId in bets) {
    const bet = bets[userId];
    payouts[userId] = fishingMasterGame.fishCaught > 5 ? bet * 2 : 0;
  }
  return payouts;
}

// ================== Start Server ==================
server.listen(PORT, () => {
  console.log(`Server with WebSocket listening on port ${PORT}`);
});
