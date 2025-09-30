const contentArea = document.getElementById('contentArea');
document.getElementById('btnUsers').addEventListener('click', loadUsers);
document.getElementById('btnGames').addEventListener('click', loadGames);
document.getElementById('btnWallet').addEventListener('click', loadWallet);
document.getElementById('btnGifts').addEventListener('click', loadGifts);
document.getElementById('btnRooms').addEventListener('click', loadRooms);

async function fetchAPI(endpoint) {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(endpoint, {
        headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Failed to fetch ' + endpoint);
    return await res.json();
}

async function loadUsers() {
    contentArea.innerHTML = '<h2>Loading Users...</h2>';
    try {
        const users = await fetchAPI('/api/admin/users');
        let html = '<h2>Users List</h2><table><thead><tr><th>Username</th><th>Email</th><th>Balance</th><th>Chips</th><th>Status</th></tr></thead><tbody>';
        users.forEach(user => {
            html += `<tr>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>₹${user.balance || 0}</td>
                <td>${user.chips || 0}</td>
                <td>${user.isBlocked ? '<span style="color:red;">Blocked</span>' : '<span style="color:green;">Active</span>'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        contentArea.innerHTML = html;
    } catch (err) {
        contentArea.innerHTML = `<p style="color:red;">Error loading users: ${err.message}</p>`;
    }
}

async function loadGames() {
    contentArea.innerHTML = '<h2>Loading Games...</h2>';
    // Similarly fetch and display game info
    // Implement your games API and render here
    contentArea.innerHTML = '<p>Games management coming soon...</p>';
}

async function loadWallet() {
    contentArea.innerHTML = '<h2>Loading Wallet Transactions...</h2>';
    // Implement wallet transaction data fetch and display
    contentArea.innerHTML = '<p>Wallet monitoring coming soon...</p>';
}

async function loadGifts() {
    contentArea.innerHTML = '<h2>Loading Gifting Management...</h2>';
    // Implement gifting management here
    contentArea.innerHTML = '<p>Gifting management coming soon...</p>';
}

async function loadRooms() {
    contentArea.innerHTML = '<h2>Loading Rooms Management...</h2>';
    // Implement room list and controls here
    contentArea.innerHTML = '<p>Room management coming soon...</p>';
}

// ================= SOCKET.IO CODE =================
const socket = io('http://localhost:5000');

// रूम अपडेट सुनें
socket.on('roomUpdate', (room) => {
  console.log('Admin room update', room);
  // रूम मॉडरेशन UI अपडेट करें
});

// बेटिंग और गेम स्टेटस अपडेट
socket.on('bettingStatus', (status) => {
  console.log('Admin betting status:', status);
});

// बेट प्लेसमेंट नोटिफ़िकेशन
socket.on('betPlaced', (bet) => {
  console.log('Admin bet placed:', bet);
});

// अन्य जरूरी नोटिफ़िकेशन
socket.on('roomFull', (roomId) => {
  alert(`Room ${roomId} is full`);
});
// ==================================================

// Initial load
loadUsers();
