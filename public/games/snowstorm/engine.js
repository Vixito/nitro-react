const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// Assets
let charImg, tilesImg;
let assetsLoaded = false;

function loadAndProcessImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tctx = tempCanvas.getContext('2d');
            tctx.drawImage(img, 0, 0);
            const imgData = tctx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            // Remove transparent checkerboard artifact (gray values)
            for(let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                // DALL-E checkerboard usually contains pure grays around 100-200
                if (Math.abs(r-g) < 10 && Math.abs(g-b) < 10 && r > 80 && r < 230) {
                    data[i+3] = 0; // Alpha = 0
                }
            }
            tctx.putImageData(imgData, 0, 0);
            const processedImg = new Image();
            processedImg.src = tempCanvas.toDataURL('image/png');
            processedImg.onload = () => resolve(processedImg);
        };
    });
}

Promise.all([
    loadAndProcessImage('assets/character.png'),
    loadAndProcessImage('assets/tiles.png')
]).then(([char, tiles]) => {
    charImg = char;
    tilesImg = tiles;
    assetsLoaded = true;
});

// Isometric Math
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

function toIso(x, y) {
    return {
        x: (x - y) * (TILE_WIDTH / 2),
        y: (x + y) * (TILE_HEIGHT / 2)
    };
}

// Game State
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', e => {
    if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', e => {
    if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

const player = {
    x: 10, y: 10, speed: 0.08,
    dir: 4, frame: 0, isMoving: false, timer: 0
};

const grid = [];
const MAP_SIZE = 20;

for (let i = 0; i < MAP_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j < MAP_SIZE; j++) {
        // Leave a safe zone around spawn
        if (i > 8 && i < 12 && j > 8 && j < 12) grid[i][j] = 0;
        else grid[i][j] = Math.random() > 0.85 ? 1 : 0; // 1 = ice block
    }
}

// Rendering
function update() {
    let dx = 0;
    let dy = 0;

    if (keys.w) { dy -= player.speed; dx -= player.speed; player.dir = 0; }
    if (keys.s) { dy += player.speed; dx += player.speed; player.dir = 4; }
    if (keys.a) { dx -= player.speed; dy += player.speed; player.dir = 6; }
    if (keys.d) { dx += player.speed; dy -= player.speed; player.dir = 2; }
    
    // Diagonal overrides
    if (keys.w && keys.a) player.dir = 7;
    if (keys.w && keys.d) player.dir = 1;
    if (keys.s && keys.a) player.dir = 5;
    if (keys.s && keys.d) player.dir = 3;

    if (dx !== 0 || dy !== 0) {
        player.isMoving = true;
        player.timer++;
        if (player.timer > 5) {
            player.frame = (player.frame + 1) % 11; // 11 frames per row
            player.timer = 0;
        }
    } else {
        player.isMoving = false;
        player.frame = 0; // Idle frame
    }

    const nextX = player.x + dx;
    const nextY = player.y + dy;

    if (nextX >= 0 && nextX < MAP_SIZE && nextY >= 0 && nextY < MAP_SIZE) {
        if (grid[Math.floor(nextX)][Math.floor(nextY)] !== 1) {
            player.x = nextX;
            player.y = nextY;
        } else {
            // Sliding collision
            if (grid[Math.floor(player.x)][Math.floor(nextY)] !== 1) player.y = nextY;
            if (grid[Math.floor(nextX)][Math.floor(player.y)] !== 1) player.x = nextX;
        }
    }
}

function loop() {
    if (!assetsLoaded) {
        requestAnimationFrame(loop);
        return;
    }
    
    update();

    ctx.clearRect(0, 0, width, height);

    const renderQueue = [];

    // Queue map tiles
    for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
            const iso = toIso(i, j);
            renderQueue.push({
                type: 'tile', x: i, y: j,
                drawX: iso.x + width / 2,
                drawY: iso.y + height / 4,
                zIndex: i + j,
                tileType: grid[i][j]
            });
        }
    }

    // Queue player
    const pIso = toIso(player.x, player.y);
    renderQueue.push({
        type: 'player',
        drawX: pIso.x + width / 2,
        drawY: pIso.y + height / 4,
        zIndex: player.x + player.y
    });

    // Sort by Z-Index (Painter's Algorithm)
    renderQueue.sort((a, b) => a.zIndex - b.zIndex);

    // Draw
    const tileW = tilesImg.width / 3;
    const charW = charImg.width / 11;
    const charH = charImg.height / 8;

    for (const item of renderQueue) {
        if (item.type === 'tile') {
            // 0 = Snow floor, 1 = Ice block
            // In tilesImg: Ice Block = 0, Snow Floor = 1
            const srcX = item.tileType === 1 ? 0 : tileW;
            // Draw tile scaled
            ctx.drawImage(tilesImg, srcX, 0, tileW, tilesImg.height, 
                item.drawX - 32, item.drawY - 32, 64, 64);
        } else if (item.type === 'player') {
            const srcY = player.dir * charH;
            const srcX = player.frame * charW;
            ctx.drawImage(charImg, srcX, srcY, charW, charH, 
                item.drawX - 32, item.drawY - 48, 64, 64);
        }
    }

    requestAnimationFrame(loop);
}

// Start Engine
loop();
