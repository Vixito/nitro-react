/**
 * Habbten SnowStorm - Official 2021 Arcade Engine
 * 1:1 Recreation of the Official Habbo SnowStorm (Lobby, Queue, Roster, Fight Night Arena & Post-Match Results)
 */

// ============================================================
// 1. Audio Synthesizer (Web Audio API)
// ============================================================
class HabboSoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playThrow() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playHit() {
        if (!this.enabled || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.12);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playReload() {
        if (!this.enabled || !this.ctx) return;
        [240, 360, 480].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.07);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.07);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.07 + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.07);
            osc.stop(this.ctx.currentTime + i * 0.07 + 0.12);
        });
    }

    playWhistle() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(2800, this.ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(2800, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
}

const sfx = new HabboSoundFX();

// ============================================================
// 2. Avatar Looks & Player Roster Data
// ============================================================
const AVATAR_FIGURES = [
    { name: 'Vixis', figure: 'hr-115-42.hd-195-19.ch-215-66.lg-270-110.sh-305-62', stars: '★★★★★' },
    { name: 'Savel', figure: 'hr-893-45.hd-180-1.ch-804-82.lg-280-92.sh-300-64', stars: '★★★★☆' },
    { name: 'Rc-Marco', figure: 'hr-831-45.hd-600-1.ch-685-71.lg-715-74.sh-730-74', stars: '★★★☆☆' },
    { name: 'JaviliyoLol', figure: 'hr-125-45.hd-209-1.ch-255-66.lg-280-110.sh-305-62', stars: '★★★★★' },
    { name: 'diavo', figure: 'hr-890-42.hd-180-19.ch-215-66.lg-275-110.sh-300-62', stars: '★★★★☆' },
    { name: 'okki-blu96', figure: 'hr-800-45.hd-600-1.ch-685-71.lg-700-74.sh-730-74', stars: '★★★☆☆' },
    { name: 'DJ-Crew.', figure: 'hr-828-45.hd-180-1.ch-804-82.lg-280-92.sh-300-64', stars: '★★★★☆' },
    { name: 'Arci', figure: 'hr-100-45.hd-209-1.ch-255-66.lg-280-110.sh-305-62', stars: '★★★★★' }
];

function getAvatarHeadUrl(figure) {
    return `https://www.habbo.com/habbo-imaging/avatarimage?figure=${figure}&headonly=1&direction=2&head_direction=2&size=m`;
}

function getAvatarFullUrl(figure, direction = 2, action = 'std') {
    return `https://www.habbo.com/habbo-imaging/avatarimage?figure=${figure}&direction=${direction}&head_direction=${direction}&size=m&action=${action}`;
}

// ============================================================
// 3. Game Flow & Screen Transitions
// ============================================================
const screens = {
    lobby: document.getElementById('screen-lobby'),
    queue: document.getElementById('screen-queue'),
    roster: document.getElementById('screen-roster'),
    arena: document.getElementById('screen-arena'),
    postmatch: document.getElementById('screen-postmatch')
};

function showScreen(name) {
    Object.keys(screens).forEach(key => {
        if (key === name) screens[key].classList.remove('hidden');
        else screens[key].classList.add('hidden');
    });
}

function exitToHotel() {
    if (window.parent) {
        window.parent.postMessage('EXIT_GAME', '*');
        window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
    }
}

// Button Handlers
document.getElementById('btn-close-window').addEventListener('click', exitToHotel);
document.getElementById('btn-flag-exit').addEventListener('click', exitToHotel);
document.getElementById('btn-leave-postmatch').addEventListener('click', exitToHotel);
document.getElementById('btn-cancel-queue').addEventListener('click', () => showScreen('lobby'));
document.getElementById('btn-cancel-queue-x').addEventListener('click', () => showScreen('lobby'));
document.getElementById('btn-leave-roster').addEventListener('click', () => showScreen('lobby'));

document.getElementById('btn-play-now').addEventListener('click', () => {
    sfx.init();
    startQueue();
});

document.getElementById('btn-rematch').addEventListener('click', () => {
    if (rematchInterval) clearInterval(rematchInterval);
    startQueue();
});

// ============================================================
// 4. Matchmaking Flow (Screenshot 2)
// ============================================================
let queueInterval = null;

function startQueue() {
    showScreen('queue');
    const container = document.getElementById('queue-slots');
    container.innerHTML = '';

    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'player-slot-card';
        slot.id = `slot-${i}`;
        slot.innerHTML = '<div class="slot-spinner"></div>';
        container.appendChild(slot);
    }

    let filled = 0;
    if (queueInterval) clearInterval(queueInterval);

    function addPlayerToSlot(idx) {
        const slot = document.getElementById(`slot-${idx}`);
        if (!slot) return;
        const player = AVATAR_FIGURES[idx % AVATAR_FIGURES.length];
        slot.className = 'player-slot-card filled';
        slot.innerHTML = `<img class="slot-avatar-img" src="${getAvatarHeadUrl(player.figure)}" alt="${player.name}">`;
    }

    addPlayerToSlot(0);
    filled = 1;

    queueInterval = setInterval(() => {
        if (filled < 8) {
            addPlayerToSlot(filled);
            filled++;
        } else {
            clearInterval(queueInterval);
            setTimeout(() => startRoster(), 700);
        }
    }, 350);
}

// ============================================================
// 5. Team Roster Flow (Screenshot 3)
// ============================================================
function startRoster() {
    showScreen('roster');

    const blueList = document.getElementById('blue-roster-list');
    const redList = document.getElementById('red-roster-list');
    blueList.innerHTML = '';
    redList.innerHTML = '';

    for (let i = 0; i < 4; i++) {
        const p = AVATAR_FIGURES[i];
        const card = document.createElement('div');
        card.className = 'roster-player-card';
        card.innerHTML = `
            <div class="roster-avatar-box">
                <img src="${getAvatarHeadUrl(p.figure)}" alt="${p.name}">
            </div>
            <div class="roster-player-info">
                <span class="roster-username">${p.name}</span>
                <span class="roster-stars">${p.stars}</span>
            </div>
        `;
        blueList.appendChild(card);
    }

    for (let i = 4; i < 8; i++) {
        const p = AVATAR_FIGURES[i];
        const card = document.createElement('div');
        card.className = 'roster-player-card';
        card.innerHTML = `
            <div class="roster-avatar-box">
                <img src="${getAvatarHeadUrl(p.figure)}" alt="${p.name}">
            </div>
            <div class="roster-player-info">
                <span class="roster-username">${p.name}</span>
                <span class="roster-stars">${p.stars}</span>
            </div>
        `;
        redList.appendChild(card);
    }

    let count = 3;
    const subText = document.getElementById('roster-countdown-text');
    subText.innerText = `Starting match in ${count}...`;

    const cdInterval = setInterval(() => {
        count--;
        if (count > 0) {
            subText.innerText = `Starting match in ${count}...`;
        } else {
            clearInterval(cdInterval);
            sfx.playWhistle();
            startFightNightArena();
        }
    }, 900);
}

// ============================================================
// 6. Fight Night Arena Engine (Screenshot 4)
// ============================================================
const canvas = document.getElementById('arena-canvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeArena() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resizeArena);
resizeArena();

const TILE_W = 64;
const TILE_H = 32;
const MAP_RADIUS = 7.5;

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

let matchTimeLeft = 120;
let matchTimerInterval = null;
let rematchInterval = null;
let blueTeamScore = 0;
let redTeamScore = 0;
let personalScore = 0;
let matchActive = false;

let fighters = [];
let snowballs = [];
let particles = [];
let mouseIso = { x: 0, y: 0 };

class Fighter {
    constructor(id, name, figure, team, startX, startY, isHuman = false) {
        this.id = id;
        this.name = name;
        this.figure = figure;
        this.team = team;
        this.x = startX;
        this.y = startY;
        this.targetX = startX;
        this.targetY = startY;
        this.isHuman = isHuman;
        this.hp = 100;
        this.maxHp = 100;
        this.ammo = 5;
        this.maxAmmo = 5;
        this.speed = 3.2;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.stunTimer = 0;
        this.dir = team === 'blue' ? 2 : 6;
        this.walkFrame = 0;
        this.walkTime = 0;
        this.aiShootTimer = Math.random() * 2 + 1.5;
        this.aiMoveTimer = Math.random() * 2 + 1;
        this.isKO = false;
        this.respawnTimer = 0;

        // Match Statistics
        this.hits = 0;
        this.kos = 0;
        this.score = 0;
    }

    update(dt) {
        if (this.isKO) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.isKO = false;
                this.hp = this.maxHp;
                this.ammo = this.maxAmmo;
                if (this.isHuman) updatePlayerHUD();
            }
            return;
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return;
        }

        if (this.isReloading) {
            this.reloadTimer += dt;
            if (this.reloadTimer >= 1.2) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                if (this.isHuman) {
                    document.getElementById('btn-make-snowballs').classList.remove('reloading');
                    updatePlayerHUD();
                }
                sfx.playReload();
            }
            return;
        }

        if (!this.isHuman) {
            this.updateAI(dt);
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.08) {
            const step = Math.min(dist, this.speed * dt);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
            this.walkTime += dt;
            this.walkFrame = Math.floor(this.walkTime * 8) % 4;
            this.dir = calcDirection(dx, dy);
        } else {
            this.walkFrame = 0;
        }
    }

    updateAI(dt) {
        const enemyTeam = this.team === 'blue' ? 'red' : 'blue';
        const enemies = fighters.filter(f => f.team === enemyTeam && !f.isKO);
        if (enemies.length === 0) return;

        let closest = enemies[0];
        let minDist = Math.hypot(closest.x - this.x, closest.y - this.y);
        for (let i = 1; i < enemies.length; i++) {
            const d = Math.hypot(enemies[i].x - this.x, enemies[i].y - this.y);
            if (d < minDist) {
                minDist = d;
                closest = enemies[i];
            }
        }

        this.aiMoveTimer -= dt;
        if (this.aiMoveTimer <= 0) {
            this.aiMoveTimer = Math.random() * 2.5 + 1.5;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (MAP_RADIUS - 1.5);
            this.targetX = 8 + Math.cos(angle) * r;
            this.targetY = 8 + Math.sin(angle) * r;
        }

        this.aiShootTimer -= dt;
        if (this.aiShootTimer <= 0) {
            this.aiShootTimer = Math.random() * 3 + 2;
            if (this.ammo > 0 && minDist < 9.0) {
                this.throwSnowballAt(closest.x, closest.y);
            } else if (this.ammo === 0) {
                this.isReloading = true;
                this.reloadTimer = 0;
            }
        }
    }

    throwSnowballAt(targetMapX, targetMapY) {
        if (this.ammo <= 0 || this.isReloading || this.stunTimer > 0 || this.isKO) return;
        this.ammo--;
        if (this.isHuman) updatePlayerHUD();
        sfx.playThrow();

        snowballs.push(new ArenaSnowball(this.x, this.y, targetMapX, targetMapY, this.team, this.id));
    }

    takeHit(damage = 25, attackerTeam, attackerId) {
        if (this.isKO) return;
        this.hp -= damage;
        this.stunTimer = 0.8;
        sfx.playHit();

        const iso = toIso(this.x, this.y);
        addSnowImpactParticles(iso.x, iso.y);

        // Score attribution
        const attacker = fighters.find(f => f.id === attackerId);
        if (attacker) {
            attacker.hits++;
            attacker.score += 2;
        }

        if (attackerTeam === 'blue') {
            blueTeamScore += 10;
            if (attackerId === 0) personalScore += 10;
        } else {
            redTeamScore += 10;
        }

        if (this.hp <= 0) {
            this.isKO = true;
            this.respawnTimer = 3.5;
            if (attacker) {
                attacker.kos++;
                attacker.score += 10;
            }
            if (attackerTeam === 'blue') {
                blueTeamScore += 100;
                if (attackerId === 0) personalScore += 100;
            } else {
                redTeamScore += 100;
            }
        }

        updateScoreboard();
        if (this.isHuman) updatePlayerHUD();
    }
}

function calcDirection(dx, dy) {
    if (dx > 0 && dy > 0) return 4;
    if (dx < 0 && dy < 0) return 0;
    if (dx > 0 && dy < 0) return 2;
    if (dx < 0 && dy > 0) return 6;
    if (dx > 0) return 3;
    if (dx < 0) return 7;
    if (dy > 0) return 5;
    return 1;
}

class ArenaSnowball {
    constructor(startX, startY, targetX, targetY, team, attackerId) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.currX = startX;
        this.currY = startY;
        this.team = team;
        this.attackerId = attackerId;
        
        const dist = Math.hypot(targetX - startX, targetY - startY);
        this.duration = Math.max(0.35, dist * 0.16);
        this.elapsed = 0;
        this.maxHeight = Math.min(90, dist * 14 + 25);
        this.active = true;
    }

    update(dt) {
        this.elapsed += dt;
        const t = Math.min(1, this.elapsed / this.duration);

        this.currX = this.startX + (this.targetX - this.startX) * t;
        this.currY = this.startY + (this.targetY - this.startY) * t;
        this.height = 4 * this.maxHeight * t * (1 - t);

        if (t >= 1) {
            this.active = false;
            this.onImpact();
        }
    }

    onImpact() {
        fighters.forEach(f => {
            if (f.team !== this.team && !f.isKO) {
                const d = Math.hypot(f.x - this.currX, f.y - this.currY);
                if (d < 0.85) {
                    f.takeHit(25, this.team, this.attackerId);
                }
            }
        });
    }
}

function addSnowImpactParticles(screenX, screenY) {
    for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 3.5 + 1.5;
        particles.push({
            x: screenX,
            y: screenY,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 1.5,
            gravity: 0.15,
            radius: Math.random() * 3 + 2,
            life: 1.0,
            decay: Math.random() * 0.04 + 0.03,
            color: '#ffffff'
        });
    }
}

const arenaObstacles = [
    { x: 5, y: 5, type: 'tree' },
    { x: 11, y: 11, type: 'tree' },
    { x: 5, y: 11, type: 'tree' },
    { x: 11, y: 5, type: 'tree' },
    { x: 8, y: 8, type: 'snowman' },
    { x: 6, y: 8, type: 'fence' },
    { x: 10, y: 8, type: 'fence' },
    { x: 8, y: 6, type: 'mound' },
    { x: 8, y: 10, type: 'mound' }
];

function startFightNightArena() {
    showScreen('arena');
    matchActive = true;
    matchTimeLeft = 120;
    blueTeamScore = 0;
    redTeamScore = 0;
    personalScore = 0;
    snowballs = [];
    particles = [];

    fighters = [
        new Fighter(0, 'Vixis', AVATAR_FIGURES[0].figure, 'blue', 6, 8, true),
        new Fighter(1, 'Savel', AVATAR_FIGURES[1].figure, 'blue', 5, 7, false),
        new Fighter(2, 'Rc-Marco', AVATAR_FIGURES[2].figure, 'blue', 5, 9, false),
        new Fighter(3, 'JaviliyoLol', AVATAR_FIGURES[3].figure, 'blue', 4, 8, false),
        new Fighter(4, 'diavo', AVATAR_FIGURES[4].figure, 'red', 10, 8, false),
        new Fighter(5, 'okki-blu96', AVATAR_FIGURES[5].figure, 'red', 11, 7, false),
        new Fighter(6, 'DJ-Crew.', AVATAR_FIGURES[6].figure, 'red', 11, 9, false),
        new Fighter(7, 'Arci', AVATAR_FIGURES[7].figure, 'red', 12, 8, false)
    ];

    updateScoreboard();
    updatePlayerHUD();

    if (matchTimerInterval) clearInterval(matchTimerInterval);
    matchTimerInterval = setInterval(() => {
        if (matchTimeLeft > 0) {
            matchTimeLeft--;
            const mins = String(Math.floor(matchTimeLeft / 60)).padStart(2, '0');
            const secs = String(matchTimeLeft % 60).padStart(2, '0');
            document.getElementById('match-timer-box').innerText = `${mins}:${secs}`;
        } else {
            clearInterval(matchTimerInterval);
            endMatchAndShowPostMatch();
        }
    }, 1000);
}

function updateScoreboard() {
    document.getElementById('blue-score-num').innerText = blueTeamScore;
    document.getElementById('red-score-num').innerText = redTeamScore;
    document.getElementById('player-personal-score').innerText = personalScore;
}

function updatePlayerHUD() {
    const p = fighters[0];
    if (!p) return;

    const fill = document.getElementById('player-health-fill');
    fill.style.height = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;

    const rack = document.getElementById('ammo-rack-vertical');
    rack.innerHTML = '';
    for (let i = 0; i < p.maxAmmo; i++) {
        const dot = document.createElement('div');
        dot.className = `ammo-circle ${i < p.ammo ? 'active' : 'empty'}`;
        rack.appendChild(dot);
    }
}

// ============================================================
// 7. Post-Match Results Flow (Screenshot 5)
// ============================================================
function endMatchAndShowPostMatch() {
    matchActive = false;
    showScreen('postmatch');
    sfx.playWhistle();

    // Ensure realistic score numbers if match ended quickly
    const blueFighters = fighters.slice(0, 4);
    const redFighters = fighters.slice(4, 8);

    blueFighters.forEach(f => {
        if (f.score === 0) {
            f.hits = Math.floor(Math.random() * 15 + 5);
            f.kos = Math.floor(Math.random() * 4 + 1);
            f.score = f.hits * 2 + f.kos * 5;
        }
    });

    redFighters.forEach(f => {
        if (f.score === 0) {
            f.hits = Math.floor(Math.random() * 15 + 4);
            f.kos = Math.floor(Math.random() * 3 + 1);
            f.score = f.hits * 2 + f.kos * 5;
        }
    });

    // Sort by score
    blueFighters.sort((a, b) => b.score - a.score);
    redFighters.sort((a, b) => b.score - a.score);

    const totalBlue = blueFighters.reduce((acc, f) => acc + f.score, 0);
    const totalRed = redFighters.reduce((acc, f) => acc + f.score, 0);

    document.getElementById('postmatch-blue-total').innerText = totalBlue;
    document.getElementById('postmatch-red-total').innerText = totalRed;

    // Winner Headline
    const winnerText = document.getElementById('postmatch-winner-text');
    if (totalBlue >= totalRed) {
        winnerText.innerText = 'Blue Team wins!';
        winnerText.className = 'winner-headline blue-win';
    } else {
        winnerText.innerText = 'Red Team wins!';
        winnerText.className = 'winner-headline red-win';
    }

    // Top MVPs
    const allFighters = [...fighters];
    allFighters.sort((a, b) => b.kos - a.kos);
    const topKo = allFighters[0];
    document.getElementById('mvp-ko-name').innerText = topKo.name;
    document.getElementById('mvp-ko-avatar').src = getAvatarFullUrl(topKo.figure, 2, 'wav');

    allFighters.sort((a, b) => b.hits - a.hits);
    const topHits = allFighters[0];
    document.getElementById('mvp-hits-name').innerText = topHits.name;
    document.getElementById('mvp-hits-avatar').src = getAvatarFullUrl(topHits.figure, 4, 'wav');

    // Populate Blue Team List
    const blueList = document.getElementById('postmatch-blue-list');
    blueList.innerHTML = '';
    blueFighters.forEach(f => {
        const row = document.createElement('div');
        row.className = 'postmatch-player-row blue';
        row.innerHTML = `
            <div class="postmatch-friend-btn">+</div>
            <div class="postmatch-avatar-col">
                <img src="${getAvatarFullUrl(f.figure, 2, 'std')}" alt="${f.name}">
            </div>
            <div class="postmatch-card-pill">
                <span class="postmatch-pname">${f.name}</span>
                <span class="postmatch-pstats">HITS: ${f.hits} &nbsp; K.O.'s: ${f.kos}</span>
            </div>
            <div class="postmatch-score-badge">${f.score}</div>
        `;
        blueList.appendChild(row);
    });

    // Populate Red Team List
    const redList = document.getElementById('postmatch-red-list');
    redList.innerHTML = '';
    redFighters.forEach(f => {
        const row = document.createElement('div');
        row.className = 'postmatch-player-row red';
        row.innerHTML = `
            <div class="postmatch-score-badge">${f.score}</div>
            <div class="postmatch-card-pill">
                <span class="postmatch-pname">${f.name}</span>
                <span class="postmatch-pstats">HITS: ${f.hits} &nbsp; K.O.'s: ${f.kos}</span>
            </div>
            <div class="postmatch-avatar-col">
                <img src="${getAvatarFullUrl(f.figure, 4, 'std')}" alt="${f.name}">
            </div>
            <div class="postmatch-friend-btn">+</div>
        `;
        redList.appendChild(row);
    });

    // Rematch 30s Countdown
    let rematchCd = 30;
    const btnRematch = document.getElementById('btn-rematch');
    btnRematch.innerText = `Rematch (${rematchCd})`;

    if (rematchInterval) clearInterval(rematchInterval);
    rematchInterval = setInterval(() => {
        rematchCd--;
        if (rematchCd > 0) {
            btnRematch.innerText = `Rematch (${rematchCd})`;
        } else {
            clearInterval(rematchInterval);
            startQueue();
        }
    }, 1000);
}

// Mouse Controls in Arena
canvas.addEventListener('mousemove', e => {
    const originX = width / 2;
    const originY = height / 2.3;
    mouseIso = fromIso(e.clientX, e.clientY, originX, originY);
});

canvas.addEventListener('mousedown', e => {
    if (!matchActive) return;
    const player = fighters[0];
    if (!player || player.isKO) return;

    const originX = width / 2;
    const originY = height / 2.3;
    const targetMap = fromIso(e.clientX, e.clientY, originX, originY);

    if (e.button === 0) {
        const d = Math.hypot(targetMap.x - player.x, targetMap.y - player.y);
        if (d > 2.5 && player.ammo > 0) {
            player.throwSnowballAt(targetMap.x, targetMap.y);
        } else {
            const distCenter = Math.hypot(targetMap.x - 8, targetMap.y - 8);
            if (distCenter < MAP_RADIUS) {
                player.targetX = targetMap.x;
                player.targetY = targetMap.y;
            }
        }
    }
});

window.addEventListener('keydown', e => {
    if (e.key === ' ' && matchActive) {
        const player = fighters[0];
        if (player && player.ammo < player.maxAmmo && !player.isReloading) {
            player.isReloading = true;
            player.reloadTimer = 0;
            document.getElementById('btn-make-snowballs').classList.add('reloading');
        }
    }
});

document.getElementById('btn-make-snowballs').addEventListener('click', () => {
    const player = fighters[0];
    if (player && player.ammo < player.maxAmmo && !player.isReloading) {
        player.isReloading = true;
        player.reloadTimer = 0;
        document.getElementById('btn-make-snowballs').classList.add('reloading');
    }
});

// ============================================================
// 8. Arena Rendering Loop
// ============================================================
let lastLoopTime = performance.now();

function renderArenaLoop(now) {
    const dt = Math.min(0.1, (now - lastLoopTime) / 1000);
    lastLoopTime = now;

    if (matchActive) {
        fighters.forEach(f => f.update(dt));
        for (let i = snowballs.length - 1; i >= 0; i--) {
            snowballs[i].update(dt);
            if (!snowballs[i].active) snowballs.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }

    ctx.clearRect(0, 0, width, height);

    const originX = width / 2;
    const originY = height / 2.3;

    drawArenaSky(ctx, width, height);
    drawSpotlights(ctx, originX, originY);
    drawCircularSnowFloor(ctx, originX, originY);

    const renderList = [];

    arenaObstacles.forEach(obs => {
        const iso = toIso(obs.x, obs.y);
        renderList.push({
            type: 'obs',
            obsType: obs.type,
            zIndex: obs.x + obs.y,
            cx: iso.x + originX,
            cy: iso.y + originY
        });
    });

    fighters.forEach(f => {
        const iso = toIso(f.x, f.y);
        renderList.push({
            type: 'fighter',
            fighter: f,
            zIndex: f.x + f.y,
            cx: iso.x + originX,
            cy: iso.y + originY
        });
    });

    snowballs.forEach(b => {
        const iso = toIso(b.currX, b.currY);
        renderList.push({
            type: 'ball',
            ball: b,
            zIndex: b.currX + b.currY + 0.5,
            cx: iso.x + originX,
            cy: iso.y + originY,
            height: b.height
        });
    });

    renderList.sort((a, b) => a.zIndex - b.zIndex);

    renderList.forEach(item => {
        if (item.type === 'obs') {
            if (item.obsType === 'tree') drawSnowTree(ctx, item.cx, item.cy);
            else if (item.obsType === 'snowman') drawSnowman(ctx, item.cx, item.cy);
            else if (item.obsType === 'fence') drawWoodenFence(ctx, item.cx, item.cy);
            else if (item.obsType === 'mound') drawSnowMound(ctx, item.cx, item.cy);
        } else if (item.type === 'fighter') {
            drawHabboFighter(ctx, item.cx, item.cy, item.fighter);
        } else if (item.type === 'ball') {
            ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
            ctx.beginPath();
            ctx.ellipse(item.cx, item.cy, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(item.cx, item.cy - item.height, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#bce2f5';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    drawTileCursor(ctx, originX, originY, mouseIso.x, mouseIso.y);

    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    requestAnimationFrame(renderArenaLoop);
}

function drawArenaSky(ctx, w, h) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, '#0a101d');
    skyGrad.addColorStop(0.6, '#1a2436');
    skyGrad.addColorStop(1, '#3b253b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#0f1827';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.lineTo(w * 0.2, h * 0.22);
    ctx.lineTo(w * 0.45, h * 0.38);
    ctx.lineTo(w * 0.7, h * 0.2);
    ctx.lineTo(w * 0.9, h * 0.36);
    ctx.lineTo(w, h * 0.25);
    ctx.lineTo(w, h * 0.5);
    ctx.lineTo(0, h * 0.5);
    ctx.closePath();
    ctx.fill();
}

function drawSpotlights(ctx, originX, originY) {
    const leftTowerX = originX - 380;
    const leftTowerY = originY - 140;
    const rightTowerX = originX + 380;
    const rightTowerY = originY - 140;

    const spotGradLeft = ctx.createRadialGradient(leftTowerX, leftTowerY, 10, originX, originY, 450);
    spotGradLeft.addColorStop(0, 'rgba(255, 255, 240, 0.45)');
    spotGradLeft.addColorStop(0.7, 'rgba(255, 255, 240, 0.1)');
    spotGradLeft.addColorStop(1, 'rgba(255, 255, 240, 0)');
    ctx.fillStyle = spotGradLeft;
    ctx.beginPath();
    ctx.moveTo(leftTowerX, leftTowerY);
    ctx.lineTo(originX + 260, originY + 120);
    ctx.lineTo(originX - 260, originY + 120);
    ctx.closePath();
    ctx.fill();

    const spotGradRight = ctx.createRadialGradient(rightTowerX, rightTowerY, 10, originX, originY, 450);
    spotGradRight.addColorStop(0, 'rgba(255, 255, 240, 0.45)');
    spotGradRight.addColorStop(0.7, 'rgba(255, 255, 240, 0.1)');
    spotGradRight.addColorStop(1, 'rgba(255, 255, 240, 0)');
    ctx.fillStyle = spotGradRight;
    ctx.beginPath();
    ctx.moveTo(rightTowerX, rightTowerY);
    ctx.lineTo(originX - 260, originY + 120);
    ctx.lineTo(originX + 260, originY + 120);
    ctx.closePath();
    ctx.fill();
}

function drawCircularSnowFloor(ctx, originX, originY) {
    ctx.fillStyle = 'rgba(2, 6, 12, 0.85)';
    ctx.beginPath();
    ctx.ellipse(originX, originY + 10, 360, 180, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eaf4fc';
    ctx.beginPath();
    ctx.ellipse(originX, originY, 340, 170, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180, 215, 235, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 16; i++) {
        const startIso = toIso(i, 0);
        const endIso = toIso(i, 16);
        ctx.beginPath();
        ctx.moveTo(startIso.x + originX, startIso.y + originY);
        ctx.lineTo(endIso.x + originX, endIso.y + originY);
        ctx.stroke();
    }
}

function drawHabboFighter(ctx, cx, cy, f) {
    if (f.isKO) {
        drawSnowMound(ctx, cx, cy);
        return;
    }

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = 'rgba(0, 20, 40, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const bounce = f.walkFrame % 2 !== 0 ? -2 : 0;
    const jacketColor = f.team === 'blue' ? '#0077b6' : '#c1121f';
    const hatColor = f.team === 'blue' ? '#00b4d8' : '#780000';

    ctx.fillStyle = jacketColor;
    ctx.beginPath();
    ctx.roundRect(-9, -22 + bounce, 18, 22, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-10, -5 + bounce, 20, 5, 2);
    ctx.fill();

    ctx.fillStyle = '#fbd1a2';
    ctx.beginPath();
    ctx.arc(0, -28 + bounce, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(-2.5, -28 + bounce, 1.2, 0, Math.PI * 2);
    ctx.arc(2.5, -28 + bounce, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hatColor;
    ctx.beginPath();
    ctx.arc(0, -32 + bounce, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -41 + bounce, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (f.stunTimer > 0) {
        ctx.fillStyle = '#ffd60a';
        const starAng = Date.now() / 150;
        for (let i = 0; i < 3; i++) {
            const sx = Math.cos(starAng + (i * Math.PI * 2) / 3) * 14;
            const sy = Math.sin(starAng + (i * Math.PI * 2) / 3) * 6 - 44;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = 'bold 10px "Ubuntu", sans-serif';
    ctx.textAlign = 'center';
    const tagW = ctx.measureText(f.name).width + 8;
    ctx.fillRect(-tagW / 2, -56, tagW, 13);
    ctx.fillStyle = f.team === 'blue' ? '#90e0ef' : '#ffb3ba';
    ctx.fillText(f.name, 0, -46);

    ctx.restore();
}

function drawSnowTree(ctx, cx, cy) {
    ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 3; i++) {
        const yOff = cy - i * 16 - 10;
        const w = 24 - i * 4;
        ctx.fillStyle = '#1e3f30';
        ctx.beginPath();
        ctx.moveTo(cx, yOff - 20);
        ctx.lineTo(cx + w, yOff);
        ctx.lineTo(cx - w, yOff);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx, yOff - 20);
        ctx.lineTo(cx + w * 0.7, yOff - 6);
        ctx.lineTo(cx - w * 0.7, yOff - 6);
        ctx.closePath();
        ctx.fill();
    }
}

function drawSnowman(ctx, cx, cy) {
    ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bce2f5';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - 26, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 26);
    ctx.lineTo(cx + 6, cy - 25);
    ctx.lineTo(cx, cy - 24);
    ctx.closePath();
    ctx.fill();
}

function drawWoodenFence(ctx, cx, cy) {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(cx - 16, cy - 14, 32, 5);
    ctx.fillRect(cx - 12, cy - 20, 5, 20);
    ctx.fillRect(cx + 7, cy - 20, 5, 20);
}

function drawSnowMound(ctx, cx, cy) {
    ctx.fillStyle = '#e2f6fd';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bfe3f9';
    ctx.stroke();
}

function drawTileCursor(ctx, originX, originY, gridX, gridY) {
    const gx = Math.round(gridX);
    const gy = Math.round(gridY);
    const iso = toIso(gx, gy);
    const cx = iso.x + originX;
    const cy = iso.y + originY;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - TILE_H / 2);
    ctx.lineTo(cx + TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx - TILE_W / 2, cy);
    ctx.closePath();
    ctx.stroke();
}

// Start Main Rendering Loop
requestAnimationFrame(renderArenaLoop);
