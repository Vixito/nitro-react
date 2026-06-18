const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

// Isometric Math
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

function toIso(x, y) {
    return {
        x: (x - y) * (TILE_WIDTH / 2),
        y: (x + y) * (TILE_HEIGHT / 2)
    };
}

function toCartesian(isoX, isoY) {
    return {
        x: (isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2,
        y: (isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2
    };
}

// Game State
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', e => {
    if(keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
    }
});

window.addEventListener('keyup', e => {
    if(keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = false;
    }
});

const player = {
    x: 10,
    y: 10,
    speed: 0.1,
    color: '#e63946'
};

const grid = [];
const MAP_SIZE = 20;

for (let i = 0; i < MAP_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j < MAP_SIZE; j++) {
        grid[i][j] = Math.random() > 0.8 ? 1 : 0; // 1 = obstacle
    }
}

// Rendering
function drawTile(x, y, type) {
    const iso = toIso(x, y);
    
    // Offset to center map
    const drawX = iso.x + width / 2;
    const drawY = iso.y + height / 4;

    ctx.beginPath();
    ctx.moveTo(drawX, drawY);
    ctx.lineTo(drawX + TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2);
    ctx.lineTo(drawX, drawY + TILE_HEIGHT);
    ctx.lineTo(drawX - TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2);
    ctx.closePath();

    if (type === 1) {
        ctx.fillStyle = '#8ecae6'; // Ice block base
        ctx.fill();
        ctx.strokeStyle = '#219ebc';
        ctx.stroke();
        
        // Draw 3D height
        ctx.beginPath();
        ctx.moveTo(drawX - TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2);
        ctx.lineTo(drawX, drawY + TILE_HEIGHT);
        ctx.lineTo(drawX, drawY + TILE_HEIGHT - 30);
        ctx.lineTo(drawX - TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2 - 30);
        ctx.closePath();
        ctx.fillStyle = '#023047';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(drawX, drawY + TILE_HEIGHT);
        ctx.lineTo(drawX + TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2);
        ctx.lineTo(drawX + TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2 - 30);
        ctx.lineTo(drawX, drawY + TILE_HEIGHT - 30);
        ctx.closePath();
        ctx.fillStyle = '#126782';
        ctx.fill();
        
        // Top cap
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - 30);
        ctx.lineTo(drawX + TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2 - 30);
        ctx.lineTo(drawX, drawY + TILE_HEIGHT - 30);
        ctx.lineTo(drawX - TILE_WIDTH / 2, drawY + TILE_HEIGHT / 2 - 30);
        ctx.closePath();
        ctx.fillStyle = '#8ecae6';
        ctx.fill();

    } else {
        ctx.fillStyle = '#f1faee'; // Snow
        ctx.fill();
        ctx.strokeStyle = '#e0e1dd';
        ctx.stroke();
    }
}

function drawPlayer() {
    const iso = toIso(player.x, player.y);
    const drawX = iso.x + width / 2;
    const drawY = iso.y + height / 4;

    ctx.beginPath();
    ctx.arc(drawX, drawY, 15, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function update() {
    let dx = 0;
    let dy = 0;

    // Movement in Isometric space requires cartesian translation
    if (keys.w) { dy -= player.speed; dx -= player.speed; }
    if (keys.s) { dy += player.speed; dx += player.speed; }
    if (keys.a) { dx -= player.speed; dy += player.speed; }
    if (keys.d) { dx += player.speed; dy -= player.speed; }

    const nextX = player.x + dx;
    const nextY = player.y + dy;

    // Collision detection (simple bounding box)
    if (nextX >= 0 && nextX < MAP_SIZE && nextY >= 0 && nextY < MAP_SIZE) {
        if (grid[Math.floor(nextX)][Math.floor(nextY)] !== 1) {
            player.x = nextX;
            player.y = nextY;
        }
    }
}

function loop() {
    update();

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
            drawTile(i, j, grid[i][j]);
        }
    }

    drawPlayer();

    requestAnimationFrame(loop);
}

// Start Engine
loop();
