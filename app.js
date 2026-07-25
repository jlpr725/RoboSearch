// Registro del Service Worker para habilitar funciones PWA y Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
            .catch(err => console.error('Error al registrar el Service Worker:', err));
    });
}

// Estado del juego
const STATE = {
    gridSize: 5,
    robot: { x: 0, y: 0, dir: 'E' },
    battery: { x: 4, y: 4 },
    obstacles: [],
    energy: 15,
    prizes: 0,
    missionCompleted: false,
    program: []
};

const DIRS = ['N', 'E', 'S', 'O'];
const DIR_ICONS = { 'N': '🤖⬆️', 'E': '🤖➡️', 'S': '🤖⬇️', 'O': '🤖⬅️' };
const OBSTACLE_TYPES = [
    { type: 'fuego', emoji: '🔥' },
    { type: 'agua', emoji: '💧' },
    { type: 'hueco', emoji: '🕳️' }
];

const gridEl = document.getElementById('game-grid');
const programArea = document.getElementById('program-area');
const modalEl = document.getElementById('game-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalBtn = document.getElementById('modal-btn');

let modalCallback = null;

function showModal(title, desc, btnText, callback) {
    modalTitle.innerText = title;
    modalDesc.innerText = desc;
    modalBtn.innerText = btnText;
    modalCallback = callback;
    modalEl.classList.remove('hidden');
}

modalBtn.addEventListener('click', () => {
    modalEl.classList.add('hidden');
    if (modalCallback) modalCallback();
});

function updateHUD() {
    document.getElementById('hud-energy').innerText = `⚡ ${STATE.energy}`;
    document.getElementById('prize-count').innerText = STATE.prizes;
    document.getElementById('mission-status').innerText = STATE.missionCompleted ? '🎯 ¡Lista!' : '🎯 Buscando';
}

function generateRandomMap() {
    STATE.robot = { x: 0, y: 0, dir: 'E' };
    STATE.battery = { x: Math.floor(Math.random() * 4) + 1, y: Math.floor(Math.random() * 4) + 1 };
    STATE.missionCompleted = false;
    STATE.obstacles = [];

    const numObstacles = Math.floor(Math.random() * 3) + 3;
    while (STATE.obstacles.length < numObstacles) {
        let ox = Math.floor(Math.random() * STATE.gridSize);
        let oy = Math.floor(Math.random() * STATE.gridSize);

        let isStart = (ox === 0 && oy === 0);
        let isBattery = (ox === STATE.battery.x && oy === STATE.battery.y);
        let exists = STATE.obstacles.some(obs => obs.x === ox && obs.y === oy);

        if (!isStart && !isBattery && !exists) {
            let randomObs = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
            STATE.obstacles.push({ x: ox, y: oy, ...randomObs });
        }
    }
    
    initMap();
}

function initMap(specialClass = null, specialCoord = null) {
    gridEl.innerHTML = '';
    
    for (let row = 0; row < STATE.gridSize; row++) {
        for (let col = 0; col < STATE.gridSize; col++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.id = `tile-${col}-${row}`;
            
            if (col === STATE.robot.x && row === STATE.robot.y) {
                tile.innerText = DIR_ICONS[STATE.robot.dir];
                if (specialClass && specialCoord && specialCoord.x === col && specialCoord.y === row) {
                    tile.classList.add(specialClass);
                }
            } else if (col === STATE.battery.x && row === STATE.battery.y && !STATE.missionCompleted) {
                tile.innerText = '🔋';
                if (specialClass && specialCoord && specialCoord.x === col && specialCoord.y === row) {
                    tile.classList.add(specialClass);
                }
            } else {
                const obs = STATE.obstacles.find(o => o.x === col && o.y === row);
                if (obs) {
                    tile.innerText = obs.emoji;
                    if (specialClass && specialCoord && specialCoord.x === col && specialCoord.y === row) {
                        tile.classList.add(specialClass);
                    }
                } else {
                    tile.innerText = '';
                }
            }
            
            gridEl.appendChild(tile);
        }
    }
    updateHUD();
}

document.querySelectorAll('.palette .block').forEach(block => {
    block.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const text = e.currentTarget.innerText;
        
        const placeholder = programArea.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();

        const blockEl = document.createElement('div');
        blockEl.classList.add('block');
        if (action.includes('si')) {
            blockEl.classList.add('block-cond');
        } else if (action === 'tomar') {
            blockEl.classList.add('block-act');
        } else {
            blockEl.classList.add('block-mov');
        }
        
        blockEl.innerText = text;
        blockEl.dataset.action = action;
        
        programArea.appendChild(blockEl);
        STATE.program.push(action);
    });
});

document.getElementById('btn-clear').addEventListener('click', () => {
    programArea.innerHTML = '<p class="placeholder-text">Arrastra o haz clic aquí...</p>';
    STATE.program = [];
    generateRandomMap();
});

document.getElementById('btn-randomize').addEventListener('click', generateRandomMap);

function isPathAheadFree() {
    let nextX = STATE.robot.x;
    let nextY = STATE.robot.y;

    if (STATE.robot.dir === 'N') nextY--;
    else if (STATE.robot.dir === 'S') nextY++;
    else if (STATE.robot.dir === 'E') nextX++;
    else if (STATE.robot.dir === 'O') nextX--;

    if (nextX < 0 || nextX >= STATE.gridSize || nextY < 0 || nextY >= STATE.gridSize) return false;
    
    const hitObs = STATE.obstacles.some(o => o.x === nextX && o.y === nextY);
    return !hitObs;
}

document.getElementById('btn-run').addEventListener('click', async () => {
    if (STATE.program.length === 0) return;
    
    for (let i = 0; i < STATE.program.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 700));
        let action = STATE.program[i];
        
        if (action === 'avanzar') {
            if (STATE.robot.dir === 'N' && STATE.robot.y > 0) STATE.robot.y--;
            else if (STATE.robot.dir === 'S' && STATE.robot.y < STATE.gridSize - 1) STATE.robot.y++;
            else if (STATE.robot.dir === 'E' && STATE.robot.x < STATE.gridSize - 1) STATE.robot.x++;
            else if (STATE.robot.dir === 'O' && STATE.robot.x > 0) STATE.robot.x--;
            else break;
        } else if (action === 'girar-der') {
            let idx = DIRS.indexOf(STATE.robot.dir);
            STATE.robot.dir = DIRS[(idx + 1) % 4];
        } else if (action === 'girar-izq') {
            let idx = DIRS.indexOf(STATE.robot.dir);
            STATE.robot.dir = DIRS[(idx + 3) % 4];
        } else if (action === 'tomar') {
            if (STATE.robot.x === STATE.battery.x && STATE.robot.y === STATE.battery.y && !STATE.missionCompleted) {
                STATE.missionCompleted = true;
                STATE.prizes += 10;
                initMap('battery-taken', { x: STATE.robot.x, y: STATE.robot.y });
                
                showModal("¡Victoria! 🎉", "¡Has tomado la batería con éxito! +10 premios.", "Continuar", () => {
                    generateRandomMap();
                });
                return;
            }
        } else if (action === 'si-camino-libre') {
            if (isPathAheadFree()) {
                if (STATE.robot.dir === 'N') STATE.robot.y--;
                else if (STATE.robot.dir === 'S') STATE.robot.y++;
                else if (STATE.robot.dir === 'E') STATE.robot.x++;
                else if (STATE.robot.dir === 'O') STATE.robot.x--;
            }
        }

        const hitObstacle = STATE.obstacles.find(o => o.x === STATE.robot.x && o.y === STATE.robot.y);
        if (hitObstacle) {
            initMap('obstacle-hit', { x: STATE.robot.x, y: STATE.robot.y });
            
            if (STATE.prizes > 0) {
                STATE.prizes = Math.max(0, STATE.prizes - 5);
                setTimeout(() => {
                    showModal("¡Cuidado! ⚠️", "El robot cayó en un obstáculo. Perdiste 5 premios.", "Reintentar", () => {});
                }, 300);
            } else {
                setTimeout(() => {
                    showModal("¡Game Over! 💥", "El robot cayó en un peligro sin premios. ¡Reiniciando nivel!", "Reiniciar", () => {
                        generateRandomMap();
                    });
                }, 300);
                return;
            }
        }
        
        initMap();
    }
});

generateRandomMap();