const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- VARIABLES GLOBALES ---
let gameStarted = false;
let isCPU = false;
let currentPlayer = 1;
let score1 = 0, score2 = 0;
const puntosParaGanar = 3;
let wind = 0;
const gravity = 0.25;

const buildings = [];
const explosions = [];
let player1 = { x: 0, y: 0, size: 28, color: '', name: '' };
let player2 = { x: 0, y: 0, size: 28, color: '', name: '' };
let banana = { x: 0, y: 0, velX: 0, velY: 0, active: false };

// --- AJUSTE DE PANTALLA ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 160; // Restamos altura de controles
    if (gameStarted) draw();
}
window.addEventListener('resize', resize);
resize();

// --- SONIDOS ---
function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'shoot') {
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        }
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    } catch(e) {}
}

// --- MUNDO ---
function generateBuildings() {
    buildings.length = 0;
    let x = 0;
    while (x < canvas.width) {
        const w = 60 + Math.random() * 60;
        const h = 80 + Math.random() * (canvas.height - 180);
        const windows = [];
        for(let wy = (canvas.height - h) + 10; wy < canvas.height - 10; wy += 20) {
            for(let wx = x + 10; wx < x + w - 10; wx += 15) {
                if(Math.random() > 0.3) windows.push({x: wx, y: wy});
            }
        }
        buildings.push({ x, y: canvas.height - h, width: w, height: h, windows });
        x += w + 2;
    }
}

function placePlayers() {
    const b1 = buildings[1] || buildings[0];
    player1.x = b1.x + b1.width/2 - player1.size/2;
    player1.y = b1.y - player1.size;
    const b2 = buildings[buildings.length - 2] || buildings[buildings.length - 1];
    player2.x = b2.x + b2.width/2 - player2.size/2;
    player2.y = b2.y - player2.size;
}

// --- LÓGICA DE TIRO ---
function shoot() {
    if (banana.active || !gameStarted) return;
    
    let angle = parseFloat(document.getElementById('angle').value);
    let power = parseFloat(document.getElementById('power').value);
    
    let finalAngle = (currentPlayer === 1) ? angle : 180 - angle;
    let rad = finalAngle * (Math.PI / 180);
    let shooter = (currentPlayer === 1) ? player1 : player2;

    banana.x = shooter.x + shooter.size/2;
    banana.y = shooter.y - 5;
    banana.velX = Math.cos(rad) * (power / 5);
    banana.velY = -Math.sin(rad) * (power / 5);
    banana.active = true;
    playSound('shoot');
    animate();
}

function animate() {
    if (!banana.active) return;
    banana.x += banana.velX; banana.y += banana.velY;
    banana.velY += gravity; banana.velX += wind;

    draw();
    
    // Dibujar banana
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath(); ctx.arc(banana.x, banana.y, 5, 0, Math.PI*2); ctx.fill();

    // Colisión edificios/suelo
    if (banana.y > canvas.height || banana.x < 0 || banana.x > canvas.width || checkBuildingHit()) {
        explosions.push({ x: banana.x, y: banana.y, r: 20 });
        playSound('explosion');
        endTurn();
        return;
    }

    // Colisión Oponente
    let target = (currentPlayer === 1) ? player2 : player1;
    if (banana.x > target.x && banana.x < target.x + target.size &&
        banana.y > target.y && banana.y < target.y + target.size) {
        banana.active = false;
        playSound('explosion');
        if(currentPlayer === 1) score1++; else score2++;
        
        setTimeout(() => {
            if(score1 >= puntosParaGanar || score2 >= puntosParaGanar) {
                alert("SERIE TERMINADA. GANADOR: " + (score1>=puntosParaGanar?player1.name:player2.name));
                location.reload();
            } else {
                nextRound();
            }
        }, 500);
        return;
    }
    requestAnimationFrame(animate);
}

function checkBuildingHit() {
    for (let b of buildings) {
        if (banana.x > b.x && banana.x < b.x + b.width && banana.y > b.y && banana.y < b.y + b.height) return true;
    }
    return false;
}

function endTurn() {
    banana.active = false;
    currentPlayer = (currentPlayer === 1) ? 2 : 1;
    wind = (Math.random() * 2 - 1) * 0.08;
    draw();
    if (isCPU && currentPlayer === 2) setTimeout(cpuTurn, 1000);
}

function cpuTurn() {
    if (!gameStarted || currentPlayer !== 2) return;
    let dist = player2.x - player1.x;
    let angleIA = 40 + Math.random() * 20;
    // IA más ajustada: divide la distancia por un factor más fino y compensa mejor el viento
    let potenciaIA = (dist / 6.8) + (wind * 250) + (Math.random() * 5);
        
    document.getElementById('angle').value = angleIA;
    document.getElementById('power').value = powerIA;
    document.getElementById('angleVal').innerText = Math.round(angleIA);
    document.getElementById('powerVal').innerText = Math.round(powerIA);
    shoot();
}

function nextRound() {
    explosions.length = 0;
    generateBuildings();
    placePlayers();
    draw();
}

// --- DIBUJO ---
function draw() {
    ctx.fillStyle = (currentPlayer === 1) ? '#0000AA' : '#440000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    buildings.forEach(b => {
        ctx.fillStyle = '#777777';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.fillStyle = '#FFFF00';
        b.windows.forEach(w => ctx.fillRect(w.x, w.y, 4, 6));
    });

    explosions.forEach(e => {
        ctx.fillStyle = (currentPlayer === 1) ? '#0000AA' : '#440000';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
    });

    drawGorilla(player1, 1);
    drawGorilla(player2, 2);
    drawUI();
}

function drawGorilla(p, num) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x + 5, p.y + 10, p.size - 10, p.size - 10); // Cuerpo
    ctx.fillRect(p.x + p.size/2 - 5, p.y, 10, 10); // Cabeza
    ctx.strokeStyle = p.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x+5, p.y+12); // Brazo L
    ctx.lineTo(p.x-4, (currentPlayer===num)?p.y:p.y+15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x+p.size-5, p.y+12); // Brazo R
    ctx.lineTo(p.x+p.size+4, p.y+15); ctx.stroke();
}

function drawUI() {
    ctx.fillStyle = 'white'; ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left"; ctx.fillText(player1.name + ": " + score1, 15, 25);
    ctx.textAlign = "right"; ctx.fillText(player2.name + ": " + score2, canvas.width - 15, 25);
    ctx.textAlign = "center";
    ctx.fillText("TURNO: " + (currentPlayer===1?player1.name:player2.name), canvas.width/2, 25);
    // Viento
    ctx.beginPath(); ctx.strokeStyle = 'white';
    ctx.moveTo(canvas.width/2, 35); ctx.lineTo(canvas.width/2 + (wind * 2000), 35); ctx.stroke();
}

// --- EVENTOS ---
document.getElementById('startBtn').addEventListener('click', () => {
    isCPU = document.getElementById('gameMode').value === 'cpu';
    player1.name = document.getElementById('p1Name').value || "Jorge";
    player1.color = document.getElementById('p1Color').value;
    player2.name = isCPU ? "CPU" : (document.getElementById('p2Name').value || "Veronica");
    player2.color = document.getElementById('p2Color').value;

    gameStarted = true;
    document.getElementById('setup-screen').style.display = 'none';
    generateBuildings(); placePlayers(); draw();
});

document.getElementById('angle').addEventListener('input', e => document.getElementById('angleVal').innerText = e.target.value);
document.getElementById('power').addEventListener('input', e => document.getElementById('powerVal').innerText = e.target.value);
document.getElementById('shootBtn').addEventListener('click', shoot);
