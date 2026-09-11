const socket = io();

// 1. Scene, Camera, Renderer setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// 3. Ground / Floor
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x55aa55 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Track other players
const otherPlayers = {};
let localPlayerId = null;

// My player object
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Camera follows local player
camera.position.set(0, 5, 7);
camera.lookAt(player.position);

// 4. Input Handling
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => handleKey(e, true));
window.addEventListener('keyup', (e) => handleKey(e, false));

function handleKey(e, isDown) {
    switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': keys.w = isDown; break;
        case 'a': case 'arrowleft': keys.a = isDown; break;
        case 's': case 'arrowdown': keys.s = isDown; break;
        case 'd': case 'arrowright': keys.d = isDown; break;
    }
}

// 5. Socket Event Listeners
socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
        if (id === socket.id) {
            localPlayerId = id;
            player.position.set(players[id].x, players[id].y, players[id].z);
        } else {
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

socket.on('disconnect', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function addOtherPlayer(id, playerInfo) {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshStandardMaterial({ color: playerInfo.color || 0x3333ff });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(playerInfo.x, playerInfo.y, playerInfo.z);
    scene.add(p);
    otherPlayers[id] = p;
}

// 6. Game Loop
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

    // Keep camera synced behind player
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 7;
    camera.lookAt(player.position.x, player.position.y, player.position.z);

    renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
