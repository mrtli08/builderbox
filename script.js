const socket = io();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x55aa55 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const otherPlayers = {};
let localPlayerId = null;

const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

camera.position.set(0, 5, 7);
camera.lookAt(player.position);

// Input Tracking
const keys = { w: false, a: false, s: false, d: false };
let isTyping = false;

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    if (isTyping) return; // Don't trigger movement if user is typing in chat
    handleKey(e, true);
});
window.addEventListener('keyup', (e) => {
    if (isTyping) return;
    handleKey(e, false);
});

function handleKey(e, isDown) {
    switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': keys.w = isDown; break;
        case 'a': case 'arrowleft': keys.a = isDown; break;
        case 's': case 'arrowdown': keys.s = isDown; break;
        case 'd': case 'arrowright': keys.d = isDown; break;
    }
}

// Chat Functionality
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

chatInput.addEventListener('focus', () => { isTyping = true; });
chatInput.addEventListener('blur', () => { isTyping = false; });

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
        socket.emit('chatMessage', text);
        chatInput.value = '';
    }
});

socket.on('chatMessage', (data) => {
    const msgEl = document.createElement('div');
    const shortId = data.id.substring(0, 4);
    msgEl.innerHTML = `<b style="color: ${data.color}">[${shortId}]:</b> ${escapeHtml(data.message)}`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
});

// Basic helper to prevent raw HTML injection
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Mobile Touch Button Listeners
const setupButton = (id, keyName) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    ['touchstart', 'mousedown'].forEach(evt => {
        btn.addEventListener(evt, (e) => {
            e.preventDefault();
            if (!isTyping) keys[keyName] = true;
        });
    });

    ['touchend', 'mouseup', 'mouseleave'].forEach(evt => {
        btn.addEventListener(evt, (e) => {
            e.preventDefault();
            keys[keyName] = false;
        });
    });
};

setupButton('btn-w', 'w');
setupButton('btn-a', 'a');
setupButton('btn-s', 's');
setupButton('btn-d', 'd');

// Socket Event Listeners
socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) {
            addOtherPlayer(id, players[id]);
        }
    });
});

socket.on('newPlayer', (data) => {
    addOtherPlayer(data.id, data.player);
});

socket.on('playerMoved', (data) => {
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].position.set(data.x, data.y, data.z);
    }
});

socket.on('removePlayer', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function addOtherPlayer(id, playerInfo) {
    if (otherPlayers[id]) return;

    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshStandardMaterial({ color: playerInfo.color || 0x3333ff });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(playerInfo.x, playerInfo.y, playerInfo.z);
    scene.add(p);
    otherPlayers[id] = p;
}

const speed = 0.1;
function animate() {
    requestAnimationFrame(animate);

    let moved = false;
    if (keys.w) { player.position.z -= speed; moved = true; }
    if (keys.s) { player.position.z += speed; moved = true; }
    if (keys.a) { player.position.x -= speed; moved = true; }
    if (keys.d) { player.position.x += speed; moved = true; }

    if (moved) {
        socket.emit('playerMovement', {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z
        });
    }

    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 7;
    camera.lookAt(player.position.x, player.position.y, player.position.z);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
