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
        // Redirect to login page if implemented
        return null;
    }
    const res = await fetch(endpoint, {
        headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
        alert('Error fetching data or session expired.');
        // Redirect to login page if needed
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
    // Fetch wallet info API implementation needed
}

async function loadGifts() {
    mainContent.innerHTML = '<h2>Your Gifts</h2><p>Gift sending and receiving interface coming soon.</p>';
    // Implement gifting feature here
}

async function loadRooms() {
    mainContent.innerHTML = '<h2>Live Rooms</h2><p>Room list and join interface coming soon.</p>';
    // Implement room list API call and UI rendering here
}

function logout() {
    localStorage.removeItem('user_token');
    window.location.reload();
}

// Initialize user profile on page load
loadUserProfile();
loadHome();
