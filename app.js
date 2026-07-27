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

        row.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            try { row.setPointerCapture(e.pointerId); } catch (err) {}
            startDrag(e.pointerId, def.action, def.icon, def.label, e.clientX, e.clientY);
        });
        row.addEventListener('pointermove', (e) => {
            if (!dragState || dragState.pointerId !== e.pointerId) return;
            moveDrag(e.clientX, e.clientY);
        });
        row.addEventListener('pointerup', (e) => {
            if (!dragState || dragState.pointerId !== e.pointerId) return;
            endDrag(e.clientX, e.clientY);
        });
        row.addEventListener('pointercancel', (e) => {
            if (!dragState || dragState.pointerId !== e.pointerId) return;
            cleanupDrag();
        });
    });
}

// ---------------- GENERACIÓN DE MAPA ----------------
const NUM_OBSTACLES = 7;
const MAX_PISO_RAMAS = 7;
const MIN_DIST_FROM_START = 4; // distancia mínima (Manhattan) desde (0,0)

function generateRandomMap() {
    STATE.robot = { x: 0, y: 0, dir: 'E' };
    STATE.missionCompleted = false;
    STATE.obstacles = [];
    STATE.energy = 15;

    // El tesoro siempre aparece en el cuadrante más alejado del inicio
    STATE.treasure = {
        x: Math.floor(Math.random() * 3) + 5, 
        y: Math.floor(Math.random() * 3) + 5  
    };

    // El booster también debe quedar alejado del inicio y no coincidir con el tesoro
    let bx, by;
    do {
        bx = Math.floor(Math.random() * (STATE.gridSize - 2)) + 1;
        by = Math.floor(Math.random() * (STATE.gridSize - 2)) + 1;
    } while (
        (bx + by) < MIN_DIST_FROM_START ||
        (bx === STATE.treasure.x && by === STATE.treasure.y)
    );
    STATE.booster = { x: bx, y: by, active: true };

    // Siempre exactamente 7 obstáculos/bloqueos en el tablero
    while (STATE.obstacles.length < NUM_OBSTACLES) {
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

    // Piso base: piso_1 / piso_2 / piso_3 distribuidos aleatoriamente
    const BASE_FLOORS = ['piso_1.png', 'piso_2.png', 'piso_3.png'];
    STATE.floorTiles = [];
    for (let row = 0; row < STATE.gridSize; row++) {
        const rowTiles = [];
        for (let col = 0; col < STATE.gridSize; col++) {
            rowTiles.push(BASE_FLOORS[Math.floor(Math.random() * BASE_FLOORS.length)]);
        }
        STATE.floorTiles.push(rowTiles);
    }

    // piso_ramas es solo decorativo: máximo 7 losetas, bien distribuidas
    const ramasCount = Math.floor(Math.random() * 4) + 4; // entre 4 y 7
    let placed = 0;
    let attempts = 0;
    while (placed < ramasCount && attempts < 200) {
        attempts++;
        const rx = Math.floor(Math.random() * STATE.gridSize);
        const ry = Math.floor(Math.random() * STATE.gridSize);
        if (rx === 0 && ry === 0) continue;
        if (STATE.floorTiles[ry][rx] === 'piso_ramas.png') continue;
        STATE.floorTiles[ry][rx] = 'piso_ramas.png';
        placed++;
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
    el.style.right = 'auto';
    el.style.bottom = 'auto';
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

// ---------------- DRAG AND DROP (Pointer Events: mouse + touch) ----------------
// Se usa la API de Pointer Events en lugar del Drag and Drop nativo de HTML5,
// porque este último no funciona en pantallas táctiles y por lo tanto el bloque
// nunca llegaba al frame de secuencia en móvil. Además, al usar coordenadas de
// pantalla (clientX/clientY) y document.elementFromPoint, la detección del
// destino funciona correctamente incluso con el giro de pantalla en móvil
// (transform: rotate(90deg)) y el escalado del stage, porque el navegador ya
// resuelve el hit-testing sobre el layout final (transformado).
let dragState = null;

function startDrag(pointerId, action, icon, label, clientX, clientY) {
    cleanupDrag();

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.backgroundImage = `url('${BLOCKS_PATH}${icon}')`;
    document.body.appendChild(ghost);

    dragState = { pointerId, action, icon, label, ghostEl: ghost };
    moveDrag(clientX, clientY);
}

function moveDrag(clientX, clientY) {
    if (!dragState) return;
    dragState.ghostEl.style.left = `${clientX}px`;
    dragState.ghostEl.style.top = `${clientY}px`;
    updateDragHover(clientX, clientY);
}

function updateDragHover(clientX, clientY) {
    document.querySelectorAll('.block-loop.mod-drag-over').forEach(b => b.classList.remove('mod-drag-over'));
    programArea.classList.remove('drag-over');

    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return;

    const targetMod = el.closest('.block-loop.block-in-program');
    if (targetMod && dragState.action !== 'loop') {
        targetMod.classList.add('mod-drag-over');
    } else if (el.closest('#program-area')) {
        programArea.classList.add('drag-over');
    }
}

function endDrag(clientX, clientY) {
    if (!dragState) return;
    const { action, icon, label } = dragState;

    const el = document.elementFromPoint(clientX, clientY);
    if (el) {
        const targetMod = el.closest('.block-loop.block-in-program');
        if (targetMod && action !== 'loop') {
            addBlockInsideLoop(targetMod, action, icon);
        } else if (el.closest('#program-area')) {
            addBlockToProgram(action, icon, label);
        }
    }
    cleanupDrag();
}

function cleanupDrag() {
    if (dragState && dragState.ghostEl) dragState.ghostEl.remove();
    document.querySelectorAll('.block-loop.mod-drag-over').forEach(b => b.classList.remove('mod-drag-over'));
    programArea.classList.remove('drag-over');
    dragState = null;
}

const MAX_SEQUENCE_BLOCKS = 15;

function addBlockToProgram(action, icon, label) {
    const currentCount = programArea.querySelectorAll(':scope > .block').length;
    if (currentCount >= MAX_SEQUENCE_BLOCKS) {
        showModal('¡Secuencia llena! 🧩', `Solo puedes usar hasta ${MAX_SEQUENCE_BLOCKS} bloques en la secuencia (uno por cada punto de energía).`, 'Entendido', () => {});
        return;
    }

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

    const SCORE_TARGET = 100;
    const checkScoreMilestone = () => {
        if (STATE.prizes >= SCORE_TARGET) {
            showModal(
                '¡Felicidades! 🏆',
                `¡Llegaste a ${SCORE_TARGET} premios! Pronto habrá una actualización con más niveles. Sigue practicando: ¡empezamos una partida nueva!`,
                'Jugar de nuevo',
                () => {
                    STATE.prizes = 0;
                    STATE.lives = 5;
                    resetLevel();
                }
            );
            return true;
        }
        return false;
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
            STATE.energy = Math.min(15, STATE.energy + 2);
            updateBoosterVisibility();
            updateHUD();
        }

        if (action === 'tomar' && STATE.robot.x === STATE.treasure.x && STATE.robot.y === STATE.treasure.y) {
            STATE.missionCompleted = true;
            STATE.prizes += 10;
            updateTreasureVisibility();
            flashTile(STATE.robot.y, STATE.robot.x, 'battery-taken');
            updateHUD();
            if (!checkScoreMilestone()) {
                showModal('¡Victoria! 🎉', '¡Tesoro asegurado! +10 premios.', 'Continuar', resetLevel);
            }
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
            const cost = inst.mult;
            if (STATE.energy < cost) { handleFailure('¡Batería Agotada!', 'Energía insuficiente para ejecutar este loop.'); break; }
            for (let i = 0; i < inst.mult; i++) {
                STATE.energy--; updateHUD();
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
