const CACHE_NAME = 'robocowboy-pwa-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './assets/backgrounds/bg.png',
    './assets/backgrounds/titulo.png',
    './assets/blocks/bloque_giro_der.png',
    './assets/blocks/bloque_giro_izq.png',
    './assets/blocks/bloque_loop.png',
    './assets/blocks/bloque_mover.png',
    './assets/blocks/bloque_tomar.png',
    './assets/buttons/btn_ejecutar.png',
    './assets/buttons/btn_eliminar.png',
    './assets/character/personaje.png',
    './assets/floors/piso_1.png',
    './assets/floors/piso_2.png',
    './assets/floors/piso_3.png',
    './assets/floors/piso_ramas.png',
    './assets/frames/frame.png',
    './assets/frames/frame_bloques.png',
    './assets/frames/frame_secuencia.png',
    './assets/goal/booster.png',
    './assets/goal/tesoro.png',
    './assets/hud/frame_energia.png',
    './assets/hud/frame_premios.png',
    './assets/hud/frame_vidas.png',
    './assets/obstacles/obs_box.png',
    './assets/obstacles/obs_cactus.png',
    './assets/obstacles/obs_hoyo.png',
    './assets/obstacles/obs_letrero.png',
    './assets/obstacles/obs_piedra.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
        ))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
