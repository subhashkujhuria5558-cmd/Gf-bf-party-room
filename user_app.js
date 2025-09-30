const mainContent = document.getElementById('mainContent');
const usernameSpan = document.getElementById('username');
const balanceSpan = document.getElementById('balance');
const chipsSpan = document.getElementById('chips');
const logoutBtn = document.getElementById('logoutBtn');

document.getElementById('btnHome').addEventListener('click', loadHome);
document.getElementById('btnGames').addEventListener('click', loadGames);
document.getElementById('btnWallet').addEventListener('click', loadWallet);
document.getElementById('btnGifts').addEventListener('click', loadGifts);
document.getElementById('btnRooms').addEventListener('click', loadRooms);
logoutBtn.addEventListener('click', logout);

function getToken() {
    return localStorage.getItem('user_token');
}

async function fetchAuthAPI(endpoint) {
    const token = getToken();
    if (!token) {
        alert('You must login first!');
        return null;
    }
    const res = await fetch(endpoint, {
        headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
        alert('Error fetching data or session expired.');
        return null;
    }
    return await res.json();
}

async function loadUserProfile() {
    const data = await fetchAuthAPI('/api/user/profile');
    if (data) {
        usernameSpan.textContent = data.username || 'User';
        balanceSpan.textContent = 'Balance: ₹' + (data.balance || 0);
        chipsSpan.textContent = 'Chips: ' + (data.chips || 0);
    }
}

async function loadHome() {
    mainContent.innerHTML = '<h2>Welcome to MAZA Gaming</h2><p>Select Games or Rooms to start playing!</p>';
}

async function loadGames() {
    mainContent.innerHTML = '<h2>Loading Games...</h2>';
    const games = await fetchAuthAPI('/api/games');
    if (games) {
        let html = '<h2>Available Games</h2><ul>';
        games.forEach(game => {
            html += `<li>${game.name} - Players: ${game.live_players || 0}</li>`;
        });
        html += '</ul>';
        mainContent.innerHTML = html;
    } else {
        mainContent.innerHTML = '<p>Error loading games.</p>';
    }
}

async function loadWallet() {
    mainContent.innerHTML = '<h2>Wallet Info</h2><p>Balance and transaction history will be shown here.</p>';
}

async function loadGifts() {
    mainContent.innerHTML = '<h2>Your Gifts</h2><p>Gift sending and receiving interface coming soon.</p>';
}

async function loadRooms() {
    mainContent.innerHTML = '<h2>Live Rooms</h2><p>Room list and join interface coming soon.</p>';
}

function logout() {
    localStorage.removeItem('user_token');
    window.location.reload();
}

// ================= SOCKET.IO CODE =================
const socket = io('http://localhost:5000'); // backend URL बदल लेना

// जब यूज़र कनेक्ट हो
socket.on('connect', () => {
  console.log('Connected to server');
});

// ---------- Room Events ----------
function joinRoom(roomId, userId) {
  socket.emit('joinRoom', { roomId, userId });
}

socket.on('roomUpdate', (room) => {
  console.log('Room updated', room);
});

socket.on('micToggled', ({ seatIndex, micOn }) => {
  console.log(`Seat ${seatIndex} mic state: ${micOn}`);
});

// ---------- Dragon Tiger Events ----------
socket.on('bettingStatus', (status) => {
  if (status === 'open') {
    console.log('Betting is now open');
  } else if (status === 'closed') {
    console.log('Betting is closed');
  }
});

socket.on('betPlaced', ({ userId, side, amount }) => {
  console.log(`User ${userId} placed ${amount} on ${side}`);
});

socket.on('roundResult', ({ dragonCard, tigerCard, winner, payouts }) => {
  console.log('Round finished!');
  console.log(`Dragon Card: ${dragonCard.rank}${dragonCard.suit}, Tiger Card: ${tigerCard.rank}${tigerCard.suit}`);
  console.log('Winner:', winner);
  console.log('Payouts:', payouts);
});

// ---------- Fishing Events ----------
socket.on('fishingStatus', (status) => {
  if (status === 'start') {
    console.log('Fishing started');
  } else if (status === 'boss_appeared') {
    console.log('Boss fish appeared!');
  }
});

socket.on('fishBetPlaced', ({ userId, amount }) => {
  console.log(`User ${userId} placed fish bet: ${amount}`);
});

socket.on('fishingRoundResult', ({ payouts, fishCaught }) => {
  console.log('Fishing round result:', payouts, fishCaught);
});

socket.on('fishCaughtUpdate', (count) => {
  console.log('Fish caught count updated:', count);
});
// ==========================================================

// Initialize on page load
loadUserProfile();
loadHome();
