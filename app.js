// Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.error('Error SW:', err));
    });
}

const STATE = {
    gridSize: 5,
    robot: { x: 0, y: 0, dir: 'E' },
    battery: { x: 4, y: 4 },
    obstacles: [],
    energy: 15,
    prizes: 0,
    lives: 5, // 5 vidas exactas
    missionCompleted: false
};

const DIRS = ['N', 'E', 'S', 'O'];
const DIR_ICONS = { 'N': '🤖⬆️', 'E': '🤖➡️', 'S': '🤖⬇️', 'O': '🤖⬅️' };
const OBSTACLE_TYPES = [{ type: 'fuego', emoji: '🔥' }, { type: 'agua', emoji: '💧' }, { type: 'hueco', emoji: '🕳️' }];

const gridEl = document.getElementById('game-grid');
const programArea = document.getElementById('program-area');
const modalEl = document.getElementById('game-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalBtn = document.getElementById('modal-btn');
let modalCallback = null;
let isExecuting = false;

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

// --- HUD LIMPIO: Sin corazones de adorno, solo los reales ---
function updateHUD() {
    document.getElementById('hud-energy-count').innerText = STATE.energy;
    document.getElementById('prize-count').innerText = STATE.prizes;
    
    let livesContainer = document.getElementById('hud-lives-count');
    if (!livesContainer) {
        const hud = document.querySelector('.game-hud');
        const livesDiv = document.createElement('div');
        livesDiv.className = 'hud-item lives-panel';
        // Se eliminó el icono extra, ahora solo muestra los corazones que dicta STATE.lives
        livesDiv.innerHTML = `<span id="hud-lives-count"></span>`;
        hud.insertBefore(livesDiv, hud.firstChild);
        livesContainer = document.getElementById('hud-lives-count');
    }
    
    // Pinta exactamente 5 corazones al inicio (y va bajando de 1 en 1)
    livesContainer.innerText = '❤️'.repeat(Math.max(0, STATE.lives));
    document.getElementById('mission-status').innerText = STATE.missionCompleted ? '🎯 Lista' : '🎯 Buscando';
}

function generateRandomMap() {
    STATE.robot = { x: 0, y: 0, dir: 'E' };
    STATE.battery = { x: Math.floor(Math.random() * 4) + 1, y: Math.floor(Math.random() * 4) + 1 };
    STATE.missionCompleted = false;
    STATE.obstacles = [];
    STATE.energy = 15;

    const numObstacles = Math.floor(Math.random() * 3) + 3;
    while (STATE.obstacles.length < numObstacles) {
        let ox = Math.floor(Math.random() * STATE.gridSize), oy = Math.floor(Math.random() * STATE.gridSize);
        if (!(ox === 0 && oy === 0) && !(ox === STATE.battery.x && oy === STATE.battery.y) && !STATE.obstacles.some(o => o.x === ox && oy === o.y)) {
            STATE.obstacles.push({ x: ox, y: oy, ...OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)] });
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
            if (col === STATE.robot.x && row === STATE.robot.y) {
                tile.innerText = DIR_ICONS[STATE.robot.dir];
                if (specialClass && specialCoord && specialCoord.x === col && specialCoord.y === row) tile.classList.add(specialClass);
            } else if (col === STATE.battery.x && row === STATE.battery.y && !STATE.missionCompleted) {
                tile.innerText = '🔋';
                if (specialClass && specialCoord && specialCoord.x === col && specialCoord.y === row) tile.classList.add(specialClass);
            } else {
                const obs = STATE.obstacles.find(o => o.x === col && o.y === row);
                if (obs) {
                    tile.innerText = obs.emoji;
                    if (specialClass && specialCoord && specialCoord.x === col && specialCoord.y === row) tile.classList.add(specialClass);
                }
            }
            gridEl.appendChild(tile);
        }
    }
    updateHUD();
}

// --- LÓGICA DE DRAG AND DROP ANIDADA ---
document.querySelectorAll('.palette .block').forEach(block => {
    block.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('action', e.currentTarget.dataset.action);
        e.dataTransfer.setData('icon', e.currentTarget.dataset.icon); 
        e.dataTransfer.setData('label', e.currentTarget.dataset.label || ''); 
    });
});

programArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetMod = e.target.closest('.block-mod.block-in-program');
    if (targetMod) targetMod.classList.add('mod-drag-over');
    else programArea.classList.add('drag-over');
});

programArea.addEventListener('dragleave', (e) => {
    const targetMod = e.target.closest('.block-mod.block-in-program');
    if (targetMod) targetMod.classList.remove('mod-drag-over');
    programArea.classList.remove('drag-over');
});

programArea.addEventListener('drop', (e) => {
    e.preventDefault();
    programArea.classList.remove('drag-over');
    document.querySelectorAll('.block-mod').forEach(b => b.classList.remove('mod-drag-over'));
    
    const action = e.dataTransfer.getData('action');
    const icon = e.dataTransfer.getData('icon');
    const label = e.dataTransfer.getData('label');
    if (!action) return;

    const targetMod = e.target.closest('.block-mod.block-in-program');
    
    if (targetMod && !action.startsWith('x')) {
        addBlockInsideMod(targetMod, action, icon);
    } else {
        addBlockToProgram(action, icon, label);
    }
});

function getBlockColorClass(action) {
    if (action.includes('si')) return 'block-cond';
    if (action === 'tomar') return 'block-act';
    if (action === 'saltar') return 'block-jump';
    if (action.startsWith('x')) return 'block-mod';
    return 'block-mov';
}

function addBlockToProgram(action, icon, label) {
    const placeholder = programArea.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    const blockEl = document.createElement('div');
    blockEl.classList.add('block', 'block-in-program', 'block-game', getBlockColorClass(action));
    blockEl.dataset.action = action;
    blockEl.title = "Haz clic para eliminar";
    
    if (action.startsWith('x')) {
        blockEl.innerHTML = `<span style="pointer-events:none;">${icon}</span><span style="pointer-events:none;" class="block-label">${label}</span> <div class="mod-slot">➕</div>`;
    } else {
        blockEl.innerText = icon;
    }
    
    blockEl.addEventListener('click', (e) => {
        if (e.target.closest('.block-nested')) return; 
        blockEl.remove();
        if (programArea.children.length === 0) programArea.innerHTML = '<p class="placeholder-text">Arrastra bloques aquí...</p>';
    });

    programArea.appendChild(blockEl);
}

function addBlockInsideMod(modEl, action, icon) {
    const slot = modEl.querySelector('.mod-slot');
    if (slot) slot.style.display = 'none'; 

    const existingChild = modEl.querySelector('.block-nested');
    if (existingChild) existingChild.remove();

    const nestedEl = document.createElement('div');
    nestedEl.classList.add('block', 'block-nested', getBlockColorClass(action));
    nestedEl.innerText = icon; 
    nestedEl.dataset.action = action;
    nestedEl.title = "Haz clic para sacar del bucle";
    
    nestedEl.addEventListener('click', (e) => {
        e.stopPropagation();
        nestedEl.remove();
        if (slot) slot.style.display = 'flex'; 
    });

    modEl.appendChild(nestedEl);
}

document.getElementById('btn-clear').addEventListener('click', () => {
    programArea.innerHTML = '<p class="placeholder-text">Arrastra bloques aquí...</p>';
});
document.getElementById('btn-randomize').addEventListener('click', generateRandomMap);

// --- COMPILACIÓN DEL DOM Y EJECUCIÓN ---
function getProgramFromDOM() {
    const program = [];
    Array.from(programArea.children).forEach(block => {
        if (!block.classList.contains('block')) return;
        const action = block.dataset.action;
        if (action.startsWith('x')) {
            const nested = block.querySelector('.block-nested');
            if (nested) {
                program.push({ type: 'loop', mult: parseInt(action.replace('x', '')), action: nested.dataset.action });
            }
        } else {
            program.push({ type: 'normal', action: action });
        }
    });
    return program;
}

function isPathAheadFree() {
    let nextX = STATE.robot.x, nextY = STATE.robot.y;
    if (STATE.robot.dir === 'N') nextY--; else if (STATE.robot.dir === 'S') nextY++;
    else if (STATE.robot.dir === 'E') nextX++; else if (STATE.robot.dir === 'O') nextX--;
    if (nextX < 0 || nextX >= STATE.gridSize || nextY < 0 || nextY >= STATE.gridSize) return false;
    return !STATE.obstacles.some(o => o.x === nextX && o.y === nextY);
}

document.getElementById('btn-run').addEventListener('click', async () => {
    if (isExecuting) return;
    const instructions = getProgramFromDOM();
    if (instructions.length === 0) return;
    
    isExecuting = true;
    let gameOver = false;

    const resetLevel = () => {
        programArea.innerHTML = '<p class="placeholder-text">Arrastra bloques aquí...</p>';
        generateRandomMap();
    };

    const handleFailure = (title, msg) => {
        gameOver = true;
        STATE.lives--;                    
        STATE.prizes = Math.max(0, STATE.prizes - 5); 
        updateHUD();                      

        if (STATE.lives <= 0) {
            showModal("¡Game Over! 💥", "Te has quedado sin vidas. ¡Reiniciando campaña!", "Reiniciar", () => {
                STATE.lives = 5;  
                STATE.prizes = 0; 
                resetLevel();
            });
        } else {
            showModal(title, `${msg} Te quedan ${STATE.lives} vidas.`, "Reintentar", resetLevel);
        }
    };

    async function executeSingle(action) {
        if (gameOver || STATE.missionCompleted) return;
        
        await new Promise(resolve => setTimeout(resolve, 600));

        if (action === 'avanzar') {
            if (STATE.robot.dir === 'N' && STATE.robot.y > 0) STATE.robot.y--;
            else if (STATE.robot.dir === 'S' && STATE.robot.y < STATE.gridSize - 1) STATE.robot.y++;
            else if (STATE.robot.dir === 'E' && STATE.robot.x < STATE.gridSize - 1) STATE.robot.x++;
            else if (STATE.robot.dir === 'O' && STATE.robot.x > 0) STATE.robot.x--;
        } else if (action === 'saltar') {
            if (STATE.robot.dir === 'N' && STATE.robot.y > 1) STATE.robot.y -= 2;
            else if (STATE.robot.dir === 'S' && STATE.robot.y < STATE.gridSize - 2) STATE.robot.y += 2;
            else if (STATE.robot.dir === 'E' && STATE.robot.x < STATE.gridSize - 2) STATE.robot.x += 2;
            else if (STATE.robot.dir === 'O' && STATE.robot.x > 1) STATE.robot.x -= 2;
        } else if (action === 'girar-der') {
            STATE.robot.dir = DIRS[(DIRS.indexOf(STATE.robot.dir) + 1) % 4];
        } else if (action === 'girar-izq') {
            STATE.robot.dir = DIRS[(DIRS.indexOf(STATE.robot.dir) + 3) % 4];
        } else if (action === 'si-camino-libre' && isPathAheadFree()) {
            if (STATE.robot.dir === 'N' && STATE.robot.y > 0) STATE.robot.y--;
            else if (STATE.robot.dir === 'S' && STATE.robot.y < STATE.gridSize - 1) STATE.robot.y++;
            else if (STATE.robot.dir === 'E' && STATE.robot.x < STATE.gridSize - 1) STATE.robot.x++;
            else if (STATE.robot.dir === 'O' && STATE.robot.x > 0) STATE.robot.x--;
        } else if (action === 'tomar') {
            if (STATE.robot.x === STATE.battery.x && STATE.robot.y === STATE.battery.y) {
                STATE.missionCompleted = true;
                STATE.prizes += 10;
                initMap('battery-taken', { x: STATE.robot.x, y: STATE.robot.y });
                showModal("¡Victoria! 🎉", "¡Batería asegurada! +10 premios.", "Continuar", resetLevel);
                return;
            }
        }

        const hitObstacle = STATE.obstacles.find(o => o.x === STATE.robot.x && o.y === STATE.robot.y);
        if (hitObstacle) {
            gameOver = true;
            initMap('obstacle-hit', { x: STATE.robot.x, y: STATE.robot.y });
            setTimeout(() => handleFailure("¡Impacto! ⚠️", "El robot chocó contra un obstáculo."), 300);
            return;
        }
        initMap();
    }

    for (let inst of instructions) {
        if (gameOver || STATE.missionCompleted) break;

        if (inst.type === 'normal') {
            if (STATE.energy < 1) { handleFailure("¡Batería Agotada!", "Te quedaste sin energía a mitad de camino."); break; }
            STATE.energy--; updateHUD();
            await executeSingle(inst.action);
        } else if (inst.type === 'loop') {
            let cost = Math.ceil(inst.mult / 2); 
            if (STATE.energy < cost) { handleFailure("¡Batería Agotada!", "Energía insuficiente para ejecutar este bucle."); break; }
            STATE.energy -= cost; updateHUD();
            
            for (let i = 0; i < inst.mult; i++) {
                await executeSingle(inst.action);
                if (gameOver || STATE.missionCompleted) break;
            }
        }
    }

    if (!STATE.missionCompleted && !gameOver) {
        handleFailure("¡Secuencia Fallida! 📡", "El código terminó pero el robot no consiguió la batería.");
    }
    
    isExecuting = false;
});

generateRandomMap();
