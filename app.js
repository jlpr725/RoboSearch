// Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.error('Error SW:', err));
    });
}

// ---------------- CONFIG DE ASSETS ----------------
const FLOOR_PATH = 'assets/floors/';
const OBSTACLE_PATH = 'assets/obstacles/';
const GOAL_PATH = 'assets/goal/';
const CHARACTER_PATH = 'assets/character/';
const BLOCKS_PATH = 'assets/blocks/';

const FLOOR_IMAGES = ['piso_1.png', 'piso_2.png', 'piso_3.png', 'piso_ramas.png']; 

const OBSTACLE_TYPES = [
    { type: 'piedra', img: 'obs_piedra.png' },
    { type: 'cactus', img: 'obs_cactus.png' },
    { type: 'box', img: 'obs_box.png' },
    { type: 'hoyo', img: 'obs_hoyo.png' },
    { type: 'letrero', img: 'obs_letrero.png' } 
];

const BLOCKS_DEF = [
    { action: 'avanzar',   icon: 'bloque_mover.png',     label: 'MOVER ADELANTE' },
    { action: 'girar-izq', icon: 'bloque_giro_izq.png',  label: 'GIRO IZQUIERDA' },
    { action: 'girar-der', icon: 'bloque_giro_der.png',  label: 'GIRO DERECHA' },
    { action: 'tomar',     icon: 'bloque_tomar.png',     label: 'TOMAR / ACCIÓN' },
    { action: 'loop',      icon: 'bloque_loop.png',      label: 'LOOP' }
];

const DIRS = ['N', 'E', 'S', 'O'];

const STATE = {
    gridSize: 8,
    robot: { x: 0, y: 0, dir: 'E' },
    treasure: { x: 7, y: 7 },
    booster: { x: 4, y: 3, active: true },
    obstacles: [],
    energy: 15,
    prizes: 0,
    lives: 5,
    missionCompleted: false,
    robotMoving: false,
    floorTiles: []
};

const gridEl = document.getElementById('game-grid');
const programArea = document.getElementById('program-area');
const blocksContainer = document.getElementById('blocks-container');
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

// ---------------- HUD ----------------
function updateHUD() {
    document.getElementById('hud-energy-count').innerText = STATE.energy;
    const prizeEl = document.getElementById('prize-count');
    if (prizeEl) prizeEl.innerText = STATE.prizes; 
    document.getElementById('hud-lives-count').innerText = STATE.lives;
}

// ---------------- PALETA DE BLOQUES ----------------
function buildPalette() {
    blocksContainer.innerHTML = '';
    BLOCKS_DEF.forEach(def => {
        const row = document.createElement('div');
        row.className = 'block-row';
        row.draggable = true;
        row.dataset.action = def.action;
        row.dataset.icon = def.icon;
        row.dataset.label = def.label;

        const icon = document.createElement('div');
        icon.className = 'block-icon';
        icon.style.backgroundImage = `url('${BLOCKS_PATH}${def.icon}')`;

        const label = document.createElement('span');
        label.className = 'block-label';
        label.innerText = def.label;

        row.appendChild(icon);
        row.appendChild(label);
        blocksContainer.appendChild(row);

        row.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('action', def.action);
            e.dataTransfer.setData('icon', def.icon);
            e.dataTransfer.setData('label', def.label);
        });
    });
}

// ---------------- GENERACIÓN DE MAPA ----------------
function generateRandomMap() {
    STATE.robot = { x: 0, y: 0, dir: 'E' };
    STATE.missionCompleted = false;
    STATE.obstacles = [];
    STATE.energy = 15;

    STATE.treasure = {
        x: Math.floor(Math.random() * 3) + 5, 
        y: Math.floor(Math.random() * 3) + 5  
    };

    let bx, by;
    do {
        bx = Math.floor(Math.random() * (STATE.gridSize - 2)) + 1;
        by = Math.floor(Math.random() * (STATE.gridSize - 2)) + 1;
    } while ((bx === 0 && by === 0) || (bx === STATE.treasure.x && by === STATE.treasure.y));
    STATE.booster = { x: bx, y: by, active: true };

    const numObstacles = Math.floor(Math.random() * 4) + 6; 
    while (STATE.obstacles.length < numObstacles) {
        const ox = Math.floor(Math.random() * STATE.gridSize);
        const oy = Math.floor(Math.random() * STATE.gridSize);
        const occupied =
            (ox === 0 && oy === 0) ||
            (ox === STATE.treasure.x && oy === STATE.treasure.y) ||
            (ox === STATE.booster.x && oy === STATE.booster.y) ||
            STATE.obstacles.some(o => o.x === ox && o.y === oy);
        if (!occupied) {
            STATE.obstacles.push({ x: ox, y: oy, ...OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)] });
        }
    }

    STATE.floorTiles = [];
    for (let row = 0; row < STATE.gridSize; row++) {
        const rowTiles = [];
        for (let col = 0; col < STATE.gridSize; col++) {
            rowTiles.push(FLOOR_IMAGES[Math.floor(Math.random() * FLOOR_IMAGES.length)]);
        }
        STATE.floorTiles.push(rowTiles);
    }

    buildStaticGrid();
}

// ---------------- RENDER DEL GRID ----------------
let tileElements = [];
let robotWrapperEl, robotImgEl, treasureEl, boosterEl;

function cellPercent() { return 100 / STATE.gridSize; }

function buildStaticGrid() {
    gridEl.innerHTML = '';
    tileElements = [];

    for (let row = 0; row < STATE.gridSize; row++) {
        const rowEls = [];
        for (let col = 0; col < STATE.gridSize; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.backgroundImage = `url('${FLOOR_PATH}${STATE.floorTiles[row][col]}')`;

            const obs = STATE.obstacles.find(o => o.x === col && o.y === row);
            if (obs) {
                const overlay = document.createElement('div');
                overlay.className = 'tile-overlay';
                overlay.style.backgroundImage = `url('${OBSTACLE_PATH}${obs.img}')`;
                tile.appendChild(overlay);
            }

            gridEl.appendChild(tile);
            rowEls.push(tile);
        }
        tileElements.push(rowEls);
    }

    treasureEl = document.createElement('div');
    treasureEl.className = 'tile-overlay';
    treasureEl.style.backgroundImage = `url('${GOAL_PATH}tesoro.png')`;
    treasureEl.style.position = 'absolute';
    treasureEl.style.zIndex = '3';
    gridEl.appendChild(treasureEl);

    boosterEl = document.createElement('div');
    boosterEl.className = 'tile-overlay';
    boosterEl.style.backgroundImage = `url('${GOAL_PATH}booster.png')`;
    boosterEl.style.position = 'absolute';
    boosterEl.style.zIndex = '3';
    gridEl.appendChild(boosterEl);

    robotWrapperEl = document.createElement('div');
    robotWrapperEl.className = 'robot-wrapper';
    robotImgEl = document.createElement('img');
    robotImgEl.className = 'robot-sprite';
    robotImgEl.src = `${CHARACTER_PATH}personaje.png`;
    robotImgEl.alt = 'personaje';
    robotWrapperEl.appendChild(robotImgEl);
    gridEl.appendChild(robotWrapperEl);

    positionOverlay(treasureEl, STATE.treasure.x, STATE.treasure.y);
    positionOverlay(boosterEl, STATE.booster.x, STATE.booster.y);
    updateTreasureVisibility();
    updateBoosterVisibility();
    updateRobotOverlay();
    updateHUD();
}

function positionOverlay(el, x, y) {
    const p = cellPercent();
    el.style.left = `${x * p}%`;
    el.style.top = `${y * p}%`;
    el.style.width = `${p}%`;
    el.style.height = `${p}%`;
    el.style.inset = 'auto'; 
    el.style.margin = '0';
}

function updateTreasureVisibility() {
    treasureEl.style.display = STATE.missionCompleted ? 'none' : 'block';
}
function updateBoosterVisibility() {
    boosterEl.style.display = STATE.booster.active ? 'block' : 'none';
}

function updateRobotOverlay() {
    const p = cellPercent();
    robotWrapperEl.style.left = `${STATE.robot.x * p}%`;
    robotWrapperEl.style.top = `${STATE.robot.y * p}%`;
    robotWrapperEl.style.width = `${p}%`;
    robotWrapperEl.style.height = `${p}%`;
    robotImgEl.style.transform = (STATE.robot.dir === 'O') ? 'scaleX(-1)' : 'scaleX(1)';
}

function flashTile(row, col, className, duration = 450) {
    const tile = tileElements[row] && tileElements[row][col];
    if (!tile) return;
    tile.classList.add(className);
    setTimeout(() => tile.classList.remove(className), duration);
}

// ---------------- DRAG AND DROP ----------------
programArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetMod = e.target.closest('.block-loop.block-in-program');
    if (targetMod) targetMod.classList.add('mod-drag-over');
    else programArea.classList.add('drag-over');
});
programArea.addEventListener('dragleave', () => {
    document.querySelectorAll('.block-loop').forEach(b => b.classList.remove('mod-drag-over'));
    programArea.classList.remove('drag-over');
});
programArea.addEventListener('drop', (e) => {
    e.preventDefault();
    programArea.classList.remove('drag-over');
    document.querySelectorAll('.block-loop').forEach(b => b.classList.remove('mod-drag-over'));

    const action = e.dataTransfer.getData('action');
    const icon = e.dataTransfer.getData('icon');
    const label = e.dataTransfer.getData('label');
    if (!action) return;

    const targetMod = e.target.closest('.block-loop.block-in-program');
    if (targetMod && action !== 'loop') {
        addBlockInsideLoop(targetMod, action, icon);
    } else {
        addBlockToProgram(action, icon, label);
    }
});

function addBlockToProgram(action, icon, label) {
    const placeholder = programArea.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    const blockEl = document.createElement('div');
    blockEl.classList.add('block', 'block-in-program');
    blockEl.dataset.action = action;
    blockEl.title = 'Haz clic para eliminar';

    if (action === 'loop') {
        blockEl.classList.add('block-loop');
        blockEl.dataset.mult = '2';
        blockEl.innerHTML = `
            <span class="loop-icon"></span>
            <span class="loop-mult">x2</span>
            <div class="mod-slot">➕</div>
        `;
    } else {
        blockEl.style.backgroundImage = `url('${BLOCKS_PATH}${icon}')`;
    }

    blockEl.addEventListener('click', (e) => {
        if (e.target.closest('.block-nested')) return;
        blockEl.remove();
        if (programArea.children.length === 0) {
            programArea.innerHTML = '<p class="placeholder-text">Arrastra bloques aquí...</p>';
        }
    });

    programArea.appendChild(blockEl);
}

function addBlockInsideLoop(loopEl, action, icon) {
    const slot = loopEl.querySelector('.mod-slot');
    if (slot) slot.style.display = 'none';

    const existing = loopEl.querySelector('.block-nested');
    if (existing) existing.remove();

    const nested = document.createElement('div');
    nested.classList.add('block-nested');
    nested.style.backgroundImage = `url('${BLOCKS_PATH}${icon}')`;
    nested.dataset.action = action;
    nested.title = 'Haz clic para sacar del loop';

    nested.addEventListener('click', (e) => {
        e.stopPropagation();
        nested.remove();
        if (slot) slot.style.display = 'flex';
    });

    const raw = window.prompt('¿Cuántas veces se repite? (2-6)', loopEl.dataset.mult || '2');
    const mult = Math.min(6, Math.max(2, parseInt(raw, 10) || 2));
    loopEl.dataset.mult = String(mult);
    loopEl.querySelector('.loop-mult').innerText = `x${mult}`;

    loopEl.appendChild(nested);
}

document.getElementById('btn-clear').addEventListener('click', () => {
    programArea.innerHTML = '<p class="placeholder-text">Arrastra bloques aquí...</p>';
});

// ---------------- COMPILACIÓN DEL PROGRAMA ----------------
function getProgramFromDOM() {
    const program = [];
    Array.from(programArea.children).forEach(block => {
        if (!block.classList.contains('block')) return;
        if (block.classList.contains('block-loop')) {
            const nested = block.querySelector('.block-nested');
            if (nested) {
                program.push({ type: 'loop', mult: parseInt(block.dataset.mult, 10) || 2, action: nested.dataset.action });
            }
        } else {
            program.push({ type: 'normal', action: block.dataset.action });
        }
    });
    return program;
}

function isCellBlocked(x, y) {
    if (x < 0 || x >= STATE.gridSize || y < 0 || y >= STATE.gridSize) return true;
    return STATE.obstacles.some(o => o.x === x && o.y === y);
}

// ---------------- EJECUCIÓN ----------------
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
            showModal('¡Game Over! 💥', 'Te has quedado sin vidas. ¡Reiniciando campaña!', 'Reiniciar', () => {
                STATE.lives = 5;
                STATE.prizes = 0;
                resetLevel();
            });
        } else {
            showModal(title, `${msg} Te quedan ${STATE.lives} vidas.`, 'Reintentar', resetLevel);
        }
    };

    function applyMovementState(action) {
        if (action === 'avanzar') {
            if (STATE.robot.dir === 'N' && STATE.robot.y > 0) STATE.robot.y--;
            else if (STATE.robot.dir === 'S' && STATE.robot.y < STATE.gridSize - 1) STATE.robot.y++;
            else if (STATE.robot.dir === 'E' && STATE.robot.x < STATE.gridSize - 1) STATE.robot.x++;
            else if (STATE.robot.dir === 'O' && STATE.robot.x > 0) STATE.robot.x--;
        } else if (action === 'girar-der') {
            STATE.robot.dir = DIRS[(DIRS.indexOf(STATE.robot.dir) + 1) % 4];
        } else if (action === 'girar-izq') {
            STATE.robot.dir = DIRS[(DIRS.indexOf(STATE.robot.dir) + 3) % 4];
        }
    }

    async function executeSingle(action) {
        if (gameOver || STATE.missionCompleted) return;

        const isMoveAction = (action === 'avanzar');

        if (isMoveAction) {
            STATE.robotMoving = true;
            updateRobotOverlay();
            await new Promise(r => setTimeout(r, 120));
            applyMovementState(action);
            updateRobotOverlay();
            await new Promise(r => setTimeout(r, 480));
            STATE.robotMoving = false;
        } else {
            await new Promise(r => setTimeout(r, 600));
            applyMovementState(action);
            updateRobotOverlay();
        }

        if (STATE.booster.active && STATE.robot.x === STATE.booster.x && STATE.robot.y === STATE.booster.y) {
            STATE.booster.active = false;
            STATE.energy += 5;
            updateBoosterVisibility();
            updateHUD();
        }

        if (action === 'tomar' && STATE.robot.x === STATE.treasure.x && STATE.robot.y === STATE.treasure.y) {
            STATE.missionCompleted = true;
            STATE.prizes += 10;
            updateTreasureVisibility();
            flashTile(STATE.robot.y, STATE.robot.x, 'battery-taken');
            showModal('¡Victoria! 🎉', '¡Tesoro asegurado! +10 premios.', 'Continuar', resetLevel);
            return;
        }

        const hitObstacle = STATE.obstacles.find(o => o.x === STATE.robot.x && o.y === STATE.robot.y);
        if (hitObstacle) {
            gameOver = true;
            flashTile(STATE.robot.y, STATE.robot.x, 'obstacle-hit');
            setTimeout(() => handleFailure('¡Impacto! ⚠️', 'El robot chocó contra un obstáculo.'), 300);
            return;
        }
        updateHUD();
    }

    for (const inst of instructions) {
        if (gameOver || STATE.missionCompleted) break;

        if (inst.type === 'normal') {
            if (STATE.energy < 1) { handleFailure('¡Batería Agotada!', 'Te quedaste sin energía a mitad de camino.'); break; }
            STATE.energy--; updateHUD();
            await executeSingle(inst.action);
        } else if (inst.type === 'loop') {
            const cost = Math.ceil(inst.mult / 2);
            if (STATE.energy < cost) { handleFailure('¡Batería Agotada!', 'Energía insuficiente para ejecutar este loop.'); break; }
            STATE.energy -= cost; updateHUD();
            for (let i = 0; i < inst.mult; i++) {
                await executeSingle(inst.action);
                if (gameOver || STATE.missionCompleted) break;
            }
        }
    }

    if (!STATE.missionCompleted && !gameOver) {
        handleFailure('¡Secuencia Fallida! 📡', 'El código terminó pero el robot no consiguió el tesoro.');
    }

    isExecuting = false;
});

// ---------------- INICIO ----------------
buildPalette();
generateRandomMap();

// ---------------- ESCALADO DEL VIEWPORT ----------------
function resizeStage() {
    const stage = document.getElementById('stage');
    const wrapper = document.querySelector('.stage-wrapper');
    const STAGE_W = 1920;
    const STAGE_H = 1080;

    // En móvil vertical, el CSS rota el stage-wrapper 90°, así que el ancho/alto
    // reales disponibles quedan invertidos respecto al viewport del navegador.
    const isMobilePortrait = window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches;
    const availableW = isMobilePortrait ? window.innerHeight : window.innerWidth;
    const availableH = isMobilePortrait ? window.innerWidth : window.innerHeight;

    const scaleW = availableW / STAGE_W;
    const scaleH = availableH / STAGE_H;
    
    const scale = Math.min(scaleW, scaleH);

    stage.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeStage);
window.addEventListener('load', resizeStage);
window.addEventListener('orientationchange', resizeStage);
resizeStage();
