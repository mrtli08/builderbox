/* 
Some use of AI has been done because im a bad programmer, and yes, this is JS not Unity so we dont have rigidbodies and stuff.
AI has been used in a form that does not change my full code and do NOT leave hate comments and stuff or i make the repository
privated
*/

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
var sounds = {jump: new Audio("Jump.wav")};
var objects = [];
var player = {
    x: 300, y: -100, img: new Image(),
    vx: 0, 
    vy: 0, 
    speed: 5, 
    gravity: 0.6, 
    jumpForce: -15, 
    grounded: false, 
    animwalkintstate: false,
};
var otherplayers = [
    /* {username: "testbot123", x: 500, y: 200, uuid: 1234} */
];
var keys = {}
player.img.src = "imgs/idle.svg";

player.img.onload = function() { // ai told me to add onload
    player.width = 120;
    player.height = 210;
}

var canvsize = {w: canvas.width, h: canvas.height};
main();

function main() {
    loadmap();
    setInterval(gameloop, 1000/30);
    setInterval(animwalkinterval, 500);
}

function animwalkinterval() {
    if (keys["a"] || keys["arrowleft"] || keys["d"] || keys["arrowright"]) {
        player.animwalkintstate = !(player.animwalkintstate);
        if (player.animwalkintstate == true) {
            player.img.src = "imgs/walk.svg"

        } else {
            player.img.src = "imgs/idle.svg"

        }
    } else {
        player.img.src = "imgs/idle.svg"

    }
}

function loadmap() {
    objects = [
        {x: 100, y: 450, height: 50, width: 800, color: "#c2c2c2"},
        {x: 200, y: 150, height: 50, width: 100,  color: "#c2c2c2"},
        {x: 800, y: 350, height: 100, width: 100,  color: "#c2c2c2"},
    ];
}

function checkAABB(a, b) { // ai used for this boilerplate function
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function tick() { // ai used for this boilerplate function
    player.vx = 0;
    if (keys["a"] || keys["arrowleft"]) player.vx = -player.speed;
    if (keys["d"] || keys["arrowright"]) player.vx = player.speed;
    player.x += player.vx;

    for (let i = 0; i < objects.length; i++) {
        let obj = objects[i];
        if (checkAABB(player, obj)) {
            if (player.vx > 0) { // Moving right -> hit left side of block
                player.x = obj.x - player.width;
            } else if (player.vx < 0) { // Moving left -> hit right side of block
                player.x = obj.x + obj.width;
            }
        }
    }

    player.vy += player.gravity;
    player.y += player.vy;

    player.grounded = false;

    for (let i = 0; i < objects.length; i++) {
        let obj = objects[i];
        if (checkAABB(player, obj)) {
            if (player.vy > 0) { // Falling -> land on top of block
                player.y = obj.y - player.height;
                player.vy = 0;
                player.grounded = true;
            } else if (player.vy < 0) { // Jumping -> hit bottom of block (ceiling)
                player.y = obj.y + obj.height;
                player.vy = 0;
            }
        }
    }

    if ((keys["w"] || keys["arrowup"] || keys[" "]) && player.grounded) {
        sounds.jump.currentTime = 0;
        sounds.jump.play().catch(() => {});
        player.vy = player.jumpForce;
        player.grounded = false;
    }
}

function gameloop() {
    tick();
    render();
}

function render() {
    ctx.fillStyle = "#96e6f2";
    ctx.fillRect(0, 0, canvsize.w, canvsize.h);
    renderobjects();
    renderplayer();
}

function renderobjects() {
    let camX = player.x - canvsize.w / 2;
    let camY = player.y - canvsize.h / 2;
    for (let i = 0; i < objects.length; i++) {
        ctx.fillStyle = objects[i].color;
        ctx.fillRect(objects[i].x - camX, objects[i].y - camY, objects[i].width, objects[i].height);
    }
}

function renderplayer() {
    // Draw main player centered on canvas
    ctx.drawImage(player.img, canvsize.w / 2, canvsize.h / 2);

    let camX = player.x - canvsize.w / 2;
    let camY = player.y - canvsize.h / 2;
    for (let i = 0; i < otherplayers.length; i++) {
        ctx.drawImage(player.img, otherplayers[i].x - camX, otherplayers[i].y - camY);        
    }
}

function respawn() {
    player.x = 300;
    player.y = -100;
}

function initNetwork() {
    // Calling io() without arguments automatically connects to the host serving the page
    socket = io();

    socket.on("currentPlayers", (serverPlayers) => {
        Object.keys(serverPlayers).forEach((id) => {
            if (id !== socket.id) {
                otherplayers[id] = serverPlayers[id];
            }
        });
    });

    socket.on("playerJoined", (data) => {
        otherplayers[data.id] = data.playerData;
    });

    socket.on("playerMoved", (data) => {
        if (otherplayers[data.id]) {
            otherplayers[data.id].x = data.x;
            otherplayers[data.id].y = data.y;
            otherplayers[data.id].animState = data.animState;
        }
    });

    socket.on("playerDisconnected", (id) => {
        delete otherplayers[id];
    });
}

document.addEventListener("keydown", function(e) { keys[e.key.toLowerCase()] = true; });
document.addEventListener("keyup", function(e) { keys[e.key.toLowerCase()] = false; });