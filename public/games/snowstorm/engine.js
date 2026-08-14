/**
 * Habbten SnowStorm - Arcade Edition
 * Authentic Isometric Snowball Fighting Engine
 */

// ==========================================
// 1. Audio Synthesizer (Web Audio API)
// ==========================================
class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playThrow() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playHit() {
        if (!this.enabled || !this.ctx) return;
        // White noise splat
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playReload() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.setValueAtTime(380, this.ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(520, this.ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playHurt() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playWave() {
        if (!this.enabled || !this.ctx) return;
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.08);
            osc.stop(this.ctx.currentTime + i * 0.08 + 0.2);
        });
    }
}

const sfx = new SoundFX();

// ==========================================
// 2. Isometric Math & Canvas Setup
// ==========================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const TILE_W = 64;
const TILE_H = 32;
const MAP_SIZE = 14;

function toIso(x, y) {
    return {
        x: (x - y) * (TILE_W / 2),
        y: (x + y) * (TILE_H / 2)
    };
}

function fromIso(screenX, screenY, originX, originY) {
    const relX = screenX - originX;
    const relY = screenY - originY;
    const x = (relX / (TILE_W / 2) + relY / (TILE_H / 2)) / 2;
    const y = (relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2;
    return { x, y };
}

// ==========================================
// 3. Game State & Entities
// ==========================================
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
let score = 0;
let highScore = parseInt(localStorage.getItem('snowstorm_highscore') || '0', 10);
let wave = 1;
let lastTime = performance.now();

// Keyboard state
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, ' ': false };
window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = true;
        keys[e.key.toLowerCase()] = true;
    }
    if (e.key === ' ' && gameState === 'PLAYING') {
        player.startReload();
    }
});
window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = false;
        keys[e.key.toLowerCase()] = false;
    }
});

let mousePos = { x: width / 2, y: height / 2 };
canvas.addEventListener('mousemove', e => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
});
canvas.addEventListener('mousedown', e => {
    sfx.init();
    if (e.button === 0 && gameState === 'PLAYING') {
        player.throwSnowball(mousePos);
    }
});

// Map definition: 0 = Snow, 1 = Ice Block, 2 = Snow Mound, 3 = Tree
let map = [];
function generateMap() {
    map = [];
    for (let i = 0; i < MAP_SIZE; i++) {
        map[i] = [];
        for (let j = 0; j < MAP_SIZE; j++) {
            // Keep center spawn clear
            if ((i >= 5 && i <= 8) && (j >= 5 && j <= 8)) {
                map[i][j] = 0;
            } else if (Math.random() < 0.08) {
                map[i][j] = 1; // Ice block
            } else if (Math.random() < 0.06) {
                map[i][j] = 2; // Snow mound
            } else if (Math.random() < 0.04) {
                map[i][j] = 3; // Tree
            } else {
                map[i][j] = 0; // Snow tile
            }
        }
    }
}

// Falling Snowflakes in Background
const snowflakes = [];
for (let i = 0; i < 80; i++) {
    snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1,
        speedY: Math.random() * 1.2 + 0.8,
        speedX: Math.random() * 0.6 - 0.3,
        alpha: Math.random() * 0.6 + 0.4
    });
}

// Particle System
const particles = [];
function addSnowExplosion(x, y, count = 16, color = '#ffffff') {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1.5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            gravity: 0.15,
            radius: Math.random() * 3 + 2,
            life: 1.0,
            decay: Math.random() * 0.04 + 0.02,
            color
        });
    }
}

// Floating score popups
const popups = [];
function addScorePopup(x, y, text, color = '#ffeb3b') {
    popups.push({
        x, y, text, color,
        life: 1.0,
        vy: -1.2
    });
}

// Projectiles (Snowballs)
const snowballs = [];

class Snowball {
    constructor(startX, startY, targetX, targetY, isPlayer = true) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.currX = startX;
        this.currY = startY;
        this.isPlayer = isPlayer;
        
        const dist = Math.hypot(targetX - startX, targetY - startY);
        this.duration = Math.max(0.35, dist * 0.15); // Duration in seconds
        this.elapsed = 0;
        this.maxHeight = Math.min(100, dist * 15 + 30);
        this.active = true;
    }

    update(dt) {
        this.elapsed += dt;
        const t = Math.min(1, this.elapsed / this.duration);

        // Linear interpolation in map space
        this.currX = this.startX + (this.targetX - this.startX) * t;
        this.currY = this.startY + (this.targetY - this.startY) * t;
        
        // Parabolic arc height
        this.height = 4 * this.maxHeight * t * (1 - t);

        if (t >= 1) {
            this.active = false;
            this.onImpact();
        }
    }

    onImpact() {
        const originX = width / 2;
        const originY = height / 3.2;
        const iso = toIso(this.currX, this.currY);
        const screenX = iso.x + originX;
        const screenY = iso.y + originY;

        sfx.playHit();
        addSnowExplosion(screenX, screenY, 14, '#e0f7fa');

        // Check hits on enemy bots or player
        if (this.isPlayer) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const d = Math.hypot(enemy.x - this.currX, enemy.y - this.currY);
                if (d < 0.9) {
                    enemy.takeHit();
                    break;
                }
            }
        } else {
            const d = Math.hypot(player.x - this.currX, player.y - this.currY);
            if (d < 0.85) {
                player.takeHit();
            }
        }
    }
}

// ==========================================
// 4. Player & Enemy Classes
// ==========================================
class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 7.0;
        this.y = 7.0;
        this.speed = 3.8;
        this.hp = 3;
        this.maxHp = 3;
        this.ammo = 5;
        this.maxAmmo = 5;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 1.2;
        this.dir = 2; // 0-7 directions
        this.invulnerableTimer = 0;
        this.walkFrame = 0;
        this.walkTime = 0;
        this.isMoving = false;
    }

    update(dt) {
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }

        if (this.isReloading) {
            this.reloadTimer += dt;
            const progress = Math.min(1, this.reloadTimer / this.reloadDuration);
            document.getElementById('reload-text').innerText = `Haciendo bolas... ${Math.round(progress * 100)}%`;
            if (this.reloadTimer >= this.reloadDuration) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                document.getElementById('reload-btn').classList.remove('active-reloading');
                document.getElementById('reload-text').innerText = 'Recargar [ESPACIO]';
                updateAmmoUI();
                sfx.playReload();
            }
        }

        // Movement input
        let dx = 0;
        let dy = 0;

        if (keys.w || keys.ArrowUp) { dx -= 1; dy -= 1; }
        if (keys.s || keys.ArrowDown) { dx += 1; dy += 1; }
        if (keys.a || keys.ArrowLeft) { dx -= 1; dy += 1; }
        if (keys.d || keys.ArrowRight) { dx += 1; dy -= 1; }

        if (dx !== 0 || dy !== 0) {
            // Normalize
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;

            const nextX = this.x + dx * this.speed * dt;
            const nextY = this.y + dy * this.speed * dt;

            // Boundary collision
            if (nextX >= 0.5 && nextX < MAP_SIZE - 0.5 && this.canMoveTo(nextX, this.y)) {
                this.x = nextX;
            }
            if (nextY >= 0.5 && nextY < MAP_SIZE - 0.5 && this.canMoveTo(this.x, nextY)) {
                this.y = nextY;
            }

            this.isMoving = true;
            this.walkTime += dt;
            this.walkFrame = Math.floor(this.walkTime * 8) % 4;

            // Determine direction based on movement
            this.dir = this.calcDirection(dx, dy);
        } else {
            this.isMoving = false;
            this.walkFrame = 0;
        }
    }

    canMoveTo(x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        if (gridX < 0 || gridX >= MAP_SIZE || gridY < 0 || gridY >= MAP_SIZE) return false;
        // Obstacles (1 = Ice block, 3 = Tree)
        const type = map[gridX][gridY];
        return type !== 1 && type !== 3;
    }

    calcDirection(dx, dy) {
        if (dx > 0 && dy > 0) return 4; // South
        if (dx < 0 && dy < 0) return 0; // North
        if (dx > 0 && dy < 0) return 2; // East
        if (dx < 0 && dy > 0) return 6; // West
        if (dx > 0) return 3; // SE
        if (dx < 0) return 7; // NW
        if (dy > 0) return 5; // SW
        return 1; // NE
    }

    throwSnowball(mouseScreen) {
        if (this.ammo <= 0) {
            this.startReload();
            return;
        }
        if (this.isReloading) return;

        const originX = width / 2;
        const originY = height / 3.2;
        const targetMap = fromIso(mouseScreen.x, mouseScreen.y, originX, originY);

        this.ammo--;
        updateAmmoUI();
        sfx.playThrow();

        snowballs.push(new Snowball(this.x, this.y, targetMap.x, targetMap.y, true));

        // Auto reload prompt if empty
        if (this.ammo === 0) {
            document.getElementById('reload-text').innerText = '¡Pulsa ESPACIO para recargar!';
        }
    }

    startReload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;
        this.isReloading = true;
        this.reloadTimer = 0;
        document.getElementById('reload-btn').classList.add('active-reloading');
    }

    takeHit() {
        if (this.invulnerableTimer > 0) return;
        this.hp--;
        this.invulnerableTimer = 1.2;
        sfx.playHurt();
        updateHealthUI();

        if (this.hp <= 0) {
            gameOver(false);
        }
    }
}

const player = new Player();

class Enemy {
    constructor(type = 'cadet') {
        this.type = type; // 'cadet', 'ranger', 'golem'
        this.hp = type === 'golem' ? 3 : 1;
        this.maxHp = this.hp;
        this.speed = type === 'ranger' ? 2.6 : (type === 'golem' ? 1.4 : 2.0);
        this.color = type === 'golem' ? '#00b4d8' : '#e63946';
        this.size = type === 'golem' ? 1.4 : 1.0;
        this.cooldown = Math.random() * 2.0 + 1.5;
        this.shootTimer = 0;
        this.dir = 4;
        this.walkFrame = 0;
        this.walkTime = 0;

        // Spawn along perimeter
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { this.x = Math.random() * 12 + 1; this.y = 1; }
        else if (side === 1) { this.x = Math.random() * 12 + 1; this.y = 12; }
        else if (side === 2) { this.x = 1; this.y = Math.random() * 12 + 1; }
        else { this.x = 12; this.y = Math.random() * 12 + 1; }
    }

    update(dt) {
        // AI movement: Seek distance around player, dodge slightly
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        let moveX = 0;
        let moveY = 0;

        if (dist > 5.5) {
            moveX = dx / dist;
            moveY = dy / dist;
        } else if (dist < 3.0) {
            moveX = -dx / dist;
            moveY = -dy / dist;
        } else {
            // Strafe
            moveX = -dy / dist * 0.7;
            moveY = dx / dist * 0.7;
        }

        const nextX = this.x + moveX * this.speed * dt;
        const nextY = this.y + moveY * this.speed * dt;

        if (nextX >= 0.5 && nextX < MAP_SIZE - 0.5 && player.canMoveTo(nextX, this.y)) {
            this.x = nextX;
        }
        if (nextY >= 0.5 && nextY < MAP_SIZE - 0.5 && player.canMoveTo(this.x, nextY)) {
            this.y = nextY;
        }

        this.walkTime += dt;
        this.walkFrame = Math.floor(this.walkTime * 8) % 4;
        this.dir = player.calcDirection(moveX, moveY);

        // Shooting logic
        this.shootTimer += dt;
        if (this.shootTimer >= this.cooldown) {
            this.shootTimer = 0;
            this.cooldown = Math.random() * 2.5 + (this.type === 'golem' ? 1.2 : 2.0);
            
            // Aim slightly ahead of player
            const leadX = player.x + (keys.d ? 1 : (keys.a ? -1 : 0)) * 0.5;
            const leadY = player.y + (keys.s ? 1 : (keys.w ? -1 : 0)) * 0.5;
            
            snowballs.push(new Snowball(this.x, this.y, leadX, leadY, false));
            sfx.playThrow();
        }
    }

    takeHit() {
        this.hp--;
        const originX = width / 2;
        const originY = height / 3.2;
        const iso = toIso(this.x, this.y);
        
        if (this.hp <= 0) {
            const pts = this.type === 'golem' ? 300 : (this.type === 'ranger' ? 150 : 100);
            addScore(pts);
            addScorePopup(iso.x + originX, iso.y + originY - 30, `+${pts}`, '#00e676');
            addSnowExplosion(iso.x + originX, iso.y + originY, 25, this.color);
            
            const idx = enemies.indexOf(this);
            if (idx >= 0) enemies.splice(idx, 1);

            // Check if wave cleared
            if (enemies.length === 0) {
                nextWave();
            }
        } else {
            addScore(50);
            addScorePopup(iso.x + originX, iso.y + originY - 30, `+50`, '#ffea00');
            addSnowExplosion(iso.x + originX, iso.y + originY, 10, '#ffffff');
        }
    }
}

let enemies = [];

function spawnWave(w) {
    enemies = [];
    const count = 3 + w * 2;
    for (let i = 0; i < count; i++) {
        let type = 'cadet';
        if (w >= 2 && Math.random() < 0.35) type = 'ranger';
        if (w >= 3 && i === count - 1) type = 'golem';
        enemies.push(new Enemy(type));
    }
    sfx.playWave();
}

function nextWave() {
    wave++;
    document.getElementById('wave-val').innerText = wave;
    addScore(wave * 250);
    const originX = width / 2;
    const originY = height / 3.2;
    addScorePopup(originX, originY, `¡RONDA ${wave}!`, '#00b4d8');
    setTimeout(() => spawnWave(wave), 1000);
}

// ==========================================
// 5. Drawing & Rendering Pipeline
// ==========================================
function drawIsoDiamond(originX, originY, gridX, gridY, topColor, leftColor, rightColor, heightOffset = 0) {
    const iso = toIso(gridX, gridY);
    const cx = iso.x + originX;
    const cy = iso.y + originY - heightOffset;

    // Top face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - TILE_H / 2);
    ctx.lineTo(cx + TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx - TILE_W / 2, cy);
    ctx.closePath();
    ctx.fill();

    // Tile outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Side 3D extrusion if heightOffset > 0
    if (heightOffset > 0) {
        // Left side
        ctx.fillStyle = leftColor;
        ctx.beginPath();
        ctx.moveTo(cx - TILE_W / 2, cy);
        ctx.lineTo(cx, cy + TILE_H / 2);
        ctx.lineTo(cx, cy + TILE_H / 2 + heightOffset);
        ctx.lineTo(cx - TILE_W / 2, cy + heightOffset);
        ctx.closePath();
        ctx.fill();

        // Right side
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy + TILE_H / 2);
        ctx.lineTo(cx + TILE_W / 2, cy);
        ctx.lineTo(cx + TILE_W / 2, cy + heightOffset);
        ctx.lineTo(cx, cy + TILE_H / 2 + heightOffset);
        ctx.closePath();
        ctx.fill();
    }
}

function drawHabboAvatar(ctx, cx, cy, isPlayer = true, dir = 4, isWalking = false, walkFrame = 0, isInvulnerable = false) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return; // Blink

    ctx.save();
    ctx.translate(cx, cy);

    // Soft Shadow
    ctx.fillStyle = 'rgba(0, 20, 40, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyColor = isPlayer ? '#0077b6' : '#c1121f';
    const hatColor = isPlayer ? '#00b4d8' : '#780000';
    const bounce = isWalking ? Math.sin(walkFrame * Math.PI) * 2 : 0;

    // Body / Parka
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-10, -22 + bounce, 20, 22, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // White fur trim
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-11, -5 + bounce, 22, 5, 3);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fbd1a2'; // Skin tone
    ctx.beginPath();
    ctx.arc(0, -28 + bounce, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#222222';
    const eyeOffset = (dir === 2 || dir === 3) ? 3 : ((dir === 6 || dir === 7) ? -3 : 0);
    ctx.beginPath();
    ctx.arc(-3 + eyeOffset, -28 + bounce, 1.5, 0, Math.PI * 2);
    ctx.arc(3 + eyeOffset, -28 + bounce, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Winter Beanie / Hat
    ctx.fillStyle = hatColor;
    ctx.beginPath();
    ctx.arc(0, -32 + bounce, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hat Pompom
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -42 + bounce, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawIceBlock(ctx, cx, cy) {
    // 3D Ice Pillar
    const h = 28;
    ctx.fillStyle = 'rgba(144, 224, 239, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - TILE_H / 2 - h);
    ctx.lineTo(cx + TILE_W / 2, cy - h);
    ctx.lineTo(cx, cy + TILE_H / 2 - h);
    ctx.lineTo(cx - TILE_W / 2, cy - h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#caf0f8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Left face
    ctx.fillStyle = 'rgba(0, 150, 199, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - TILE_W / 2, cy - h);
    ctx.lineTo(cx, cy + TILE_H / 2 - h);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx - TILE_W / 2, cy);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = 'rgba(0, 119, 182, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx, cy + TILE_H / 2 - h);
    ctx.lineTo(cx + TILE_W / 2, cy - h);
    ctx.lineTo(cx + TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.closePath();
    ctx.fill();
}

function drawSnowMound(ctx, cx, cy) {
    ctx.fillStyle = '#e2f6fd';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bfe3f9';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 3, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawPineTree(ctx, cx, cy) {
    // Tree Shadow
    ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3 Snow-Covered Tree Cones
    for (let i = 0; i < 3; i++) {
        const yOff = cy - i * 16 - 10;
        const w = 24 - i * 4;
        
        ctx.fillStyle = '#1b4332'; // Deep pine green
        ctx.beginPath();
        ctx.moveTo(cx, yOff - 20);
        ctx.lineTo(cx + w, yOff);
        ctx.lineTo(cx - w, yOff);
        ctx.closePath();
        ctx.fill();

        // Snow layer on top of branches
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx, yOff - 20);
        ctx.lineTo(cx + w * 0.7, yOff - 6);
        ctx.lineTo(cx - w * 0.7, yOff - 6);
        ctx.closePath();
        ctx.fill();
    }
}

// ==========================================
// 6. Main Game Loop
// ==========================================
function gameLoop(time) {
    const dt = Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;

    // 1. Update logic
    if (gameState === 'PLAYING') {
        player.update(dt);
        enemies.forEach(e => e.update(dt));

        for (let i = snowballs.length - 1; i >= 0; i--) {
            snowballs[i].update(dt);
            if (!snowballs[i].active) snowballs.splice(i, 1);
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Popups
    for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.y += pop.vy;
        pop.life -= dt * 1.5;
        if (pop.life <= 0) popups.splice(i, 1);
    }

    // Update Background Snowflakes
    snowflakes.forEach(f => {
        f.y += f.speedY;
        f.x += f.speedX;
        if (f.y > height) { f.y = -10; f.x = Math.random() * width; }
    });

    // 2. Render Scene
    ctx.clearRect(0, 0, width, height);

    // Draw Falling Snowflakes Background
    ctx.fillStyle = '#ffffff';
    snowflakes.forEach(f => {
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    const originX = width / 2;
    const originY = height / 3.2;

    // Ground Shadow under Arena
    ctx.fillStyle = 'rgba(2, 10, 20, 0.45)';
    ctx.beginPath();
    const topIso = toIso(0, 0);
    const rightIso = toIso(MAP_SIZE, 0);
    const bottomIso = toIso(MAP_SIZE, MAP_SIZE);
    const leftIso = toIso(0, MAP_SIZE);
    ctx.moveTo(topIso.x + originX, topIso.y + originY - 10);
    ctx.lineTo(rightIso.x + originX + 20, rightIso.y + originY + 10);
    ctx.lineTo(bottomIso.x + originX, bottomIso.y + originY + 30);
    ctx.lineTo(leftIso.x + originX - 20, leftIso.y + originY + 10);
    ctx.closePath();
    ctx.fill();

    // Render Tiles
    for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
            const isAlt = (i + j) % 2 === 0;
            const topColor = isAlt ? '#edf6f9' : '#d8eefe';
            drawIsoDiamond(originX, originY, i, j, topColor, '#a2d2ff', '#83bdf5', 0);
        }
    }

    // Queue Objects & Entities for Z-Sorting (Painter's Algorithm)
    const renderQueue = [];

    // Map obstacles
    for (let i = 0; i < MAP_SIZE; i++) {
        for (let j = 0; j < MAP_SIZE; j++) {
            const type = map[i][j];
            if (type !== 0) {
                const iso = toIso(i, j);
                renderQueue.push({
                    type: 'obstacle',
                    subType: type,
                    x: i, y: j,
                    zIndex: i + j + 0.1,
                    cx: iso.x + originX,
                    cy: iso.y + originY
                });
            }
        }
    }

    // Player
    const playerIso = toIso(player.x, player.y);
    renderQueue.push({
        type: 'player',
        zIndex: player.x + player.y,
        cx: playerIso.x + originX,
        cy: playerIso.y + originY
    });

    // Enemies
    enemies.forEach(e => {
        const eIso = toIso(e.x, e.y);
        renderQueue.push({
            type: 'enemy',
            enemy: e,
            zIndex: e.x + e.y,
            cx: eIso.x + originX,
            cy: eIso.y + originY
        });
    });

    // Snowballs (Sorted by ground pos)
    snowballs.forEach(b => {
        const bIso = toIso(b.currX, b.currY);
        renderQueue.push({
            type: 'snowball',
            ball: b,
            zIndex: b.currX + b.currY + 0.5,
            cx: bIso.x + originX,
            cy: bIso.y + originY,
            height: b.height
        });
    });

    // Sort by Z-Index
    renderQueue.sort((a, b) => a.zIndex - b.zIndex);

    // Draw sorted items
    renderQueue.forEach(item => {
        if (item.type === 'obstacle') {
            if (item.subType === 1) drawIceBlock(ctx, item.cx, item.cy);
            else if (item.subType === 2) drawSnowMound(ctx, item.cx, item.cy);
            else if (item.subType === 3) drawPineTree(ctx, item.cx, item.cy);
        } else if (item.type === 'player') {
            drawHabboAvatar(ctx, item.cx, item.cy, true, player.dir, player.isMoving, player.walkFrame, player.invulnerableTimer > 0);
        } else if (item.type === 'enemy') {
            drawHabboAvatar(ctx, item.cx, item.cy, false, item.enemy.dir, true, item.enemy.walkFrame, false);
            // Enemy HP bar for Boss
            if (item.enemy.type === 'golem') {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(item.cx - 15, item.cy - 52, 30, 5);
                ctx.fillStyle = '#00e676';
                ctx.fillRect(item.cx - 15, item.cy - 52, (item.enemy.hp / item.enemy.maxHp) * 30, 5);
            }
        } else if (item.type === 'snowball') {
            // Shadow on floor
            ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
            ctx.beginPath();
            ctx.ellipse(item.cx, item.cy, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Flying Snowball
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(item.cx, item.cy - item.height, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#caf0f8';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    // Draw Particles on top
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Popups
    popups.forEach(pop => {
        ctx.globalAlpha = pop.life;
        ctx.font = 'bold 16px "Ubuntu", sans-serif';
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1.0;

    requestAnimationFrame(gameLoop);
}

// ==========================================
// 7. UI Updates & Game Lifecycle
// ==========================================
function updateHealthUI() {
    const container = document.getElementById('hearts-container');
    container.innerHTML = '';
    for (let i = 0; i < player.maxHp; i++) {
        const heart = document.createElement('span');
        heart.className = `heart ${i < player.hp ? 'full' : 'empty'}`;
        heart.innerText = '❤️';
        container.appendChild(heart);
    }
}

function updateAmmoUI() {
    const rack = document.getElementById('snowballs-rack');
    rack.innerHTML = '';
    for (let i = 0; i < player.maxAmmo; i++) {
        const slot = document.createElement('div');
        slot.className = `snowball-slot ${i < player.ammo ? 'active' : 'empty'}`;
        rack.appendChild(slot);
    }
}

function addScore(pts) {
    score += pts;
    document.getElementById('score-val').innerText = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snowstorm_highscore', highScore);
        document.getElementById('highscore-val').innerText = highScore;
    }
}

function startGame() {
    sfx.init();
    score = 0;
    wave = 1;
    document.getElementById('score-val').innerText = '0';
    document.getElementById('wave-val').innerText = '1';
    document.getElementById('highscore-val').innerText = highScore;

    player.reset();
    generateMap();
    spawnWave(wave);
    updateHealthUI();
    updateAmmoUI();

    document.getElementById('start-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');
    gameState = 'PLAYING';
}

function gameOver(isWin = false) {
    gameState = 'GAMEOVER';
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-wave').innerText = wave;
    
    if (isWin) {
        document.getElementById('gameover-title').innerText = '¡VICTORIA INVERNAL!';
        document.getElementById('gameover-subtitle').innerText = '¡Has derrotado a todas las rondas de nieve!';
    } else {
        document.getElementById('gameover-title').innerText = '¡PARTIDA TERMINADA!';
        document.getElementById('gameover-subtitle').innerText = '¡Te han congelado! Inténtalo de nuevo.';
    }

    document.getElementById('gameover-overlay').classList.remove('hidden');
}

function exitToHotel() {
    if (window.parent) {
        window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
        window.parent.postMessage('EXIT_GAME', '*');
    }
}

// Button listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('exit-btn').addEventListener('click', exitToHotel);
document.getElementById('modal-exit-btn').addEventListener('click', exitToHotel);
document.getElementById('reload-btn').addEventListener('click', () => player.startReload());
document.getElementById('sound-btn').addEventListener('click', (e) => {
    const isMuted = !sfx.toggle();
    e.target.innerText = isMuted ? '🔇' : '🔊';
});

// Start Engine Loop
document.getElementById('highscore-val').innerText = highScore;
requestAnimationFrame(gameLoop);
