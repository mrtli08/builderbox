const socket = io();

// 1. Physics World Setup (Cannon.js)
const world = new CANNON.World();
world.gravity.set(0, -15, 0);

// 2. Three.js Scene Setup
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

// 3. Ground (Physics + Visuals)
const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: new CANNON.Material({ friction: 0.0 }) // Zero friction ground so you never get stuck!
});
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(floorBody);

const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x55aa55 });
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

// 4. Local Player (Physics + Visuals)
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({
    mass: 1,
    shape: playerShape,
    position: new CANNON.Vec3(0, 5, 0),
    material: new CANNON.Material({ friction: 0.0 }) // Zero friction player
});
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333 });
const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(playerMesh);

const otherPlayers = {};

// Input Tracking
const keys = { w: false, a: false, s: false, d: false };
let isTyping = false;

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    if (isTyping) return;
    if (e.code === 'Space') { triggerJump(); e.preventDefault(); }
    else handleKey(e, true);
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

function triggerJump() {
    // Generous ground check so jumping always works
    if (playerBody.position.y < 1.6 && Math.abs(playerBody.velocity.y) < 1) {
        playerBody.velocity.y = 7;
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Mobile Touch Controls Setup
const setupButton = (id, keyName) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    ['touchstart', 'mousedown'].forEach(evt => btn.addEventListener(evt, (e) => { e.preventDefault(); if (!isTyping) keys[keyName] = true; }));
    ['touchend', 'mouseup', 'mouseleave'].forEach(evt => btn.addEventListener(evt, (e) => { e.preventDefault(); keys[keyName] = false; }));
};

setupButton('btn-w', 'w');
setupButton('btn-a', 'a');
setupButton('btn-s', 's');
setupButton('btn-d', 'd');

const jumpBtn = document.getElementById('jump-control');
if (jumpBtn) {
    ['touchstart', 'mousedown'].forEach(evt => jumpBtn.addEventListener(evt, (e) => { e.preventDefault(); triggerJump(); }));
}

// Socket Event Listeners for Multiplayer
socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) addOtherPlayer(id, players[id]);
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

// 5. Main Game Loop
const moveSpeed = 5;
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    world.step(1 / 60, deltaTime, 3);

    // Wake up the physics body so it's always responsive to input
    playerBody.wakeUp();

    let vx = 0;
    let vz = 0;
    if (keys.w) vz -= moveSpeed;
    if (keys.s) vz += moveSpeed;
    if (keys.a) vx -= moveSpeed;
    if (keys.d) vx += moveSpeed;

    // Directly assign velocity while keeping the current falling/jumping velocity intact
    playerBody.velocity.x = vx;
    playerBody.velocity.z = vz;

    // Sync Three.js mesh with physics body
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);

    // Send position to server
    socket.emit('playerMovement', {
        x: playerBody.position.x,
        y: playerBody.position.y,
        z: playerBody.position.z
    });

    // Camera follow
    camera.position.x = playerMesh.position.x;
    camera.position.y = playerMesh.position.y + 4;
    camera.position.z = playerMesh.position.z + 7;
    camera.lookAt(playerMesh.position.x, playerMesh.position.y, playerMesh.position.z);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
