# 🤠 Robo Cowboy — Codifica y Encuentra el Tesoro

**Robo Cowboy** es una Progressive Web App (PWA) educativa que enseña **pensamiento computacional** a través de la programación por bloques. El jugador arma una secuencia de instrucciones para guiar a un robot vaquero a través de un tablero, esquivando obstáculos, recolectando energía y llegando hasta el tesoro.

Funciona completamente en el navegador, sin conexión (offline) una vez instalada, y se puede agregar a la pantalla de inicio de cualquier dispositivo (Android, iOS, Windows, macOS).

---

## 🎮 ¿De qué trata el juego?

El jugador debe **programar** los movimientos de un robot arrastrando bloques de instrucciones a una zona de secuencia, para que el robot recorra un tablero de 8x8, esquive obstáculos, recoja un booster de energía y llegue hasta el cofre del tesoro.

Cada partida genera un **mapa aleatorio nuevo**: la posición del tesoro, el booster, los obstáculos y la decoración del piso cambian cada vez, así que no hay dos partidas iguales.

---

## 🧩 Cómo se juega

### 1. Bloques disponibles
| Bloque | Acción |
|---|---|
| **Mover adelante** | Avanza una casilla en la dirección actual del robot |
| **Giro izquierda** | Rota al robot 90° a la izquierda |
| **Giro derecha** | Rota al robot 90° a la derecha |
| **Tomar / Acción** | Recoge el tesoro si el robot está sobre él |
| **Loop** | Repite un bloque anidado entre 2 y 6 veces |

### 2. Construir la secuencia
- Arrastra bloques desde la paleta hacia el área de secuencia ("Arrastra bloques aquí...").
- Puedes colocar **hasta 15 bloques** en la secuencia.
- El bloque **Loop** permite anidar una acción dentro de él y repetirla varias veces; haz clic en el bloque anidado para sacarlo.
- Haz clic sobre cualquier bloque de la secuencia para eliminarlo.
- El botón de eliminar (🗑️) borra toda la secuencia de una vez.

### 3. Energía ⚡
- El robot comienza con **15 puntos de energía**.
- **Cada bloque ejecutado** (incluidas las repeticiones dentro de un loop) consume **1 punto de energía**.
- Si el robot pasa sobre el **booster** (botella), recupera **+2 puntos de energía** y el booster desaparece del mapa.
- Si la energía llega a 0 antes de completar la secuencia, la misión falla.

### 4. Obstáculos y piso
- El tablero siempre tiene **7 obstáculos** (piedra, cactus, caja, hoyo, letrero) distribuidos aleatoriamente.
- El piso se dibuja con texturas piso_1, piso_2 y piso_3, más hasta **7 losetas decorativas de "ramas"** repartidas por el mapa (no afectan el movimiento).
- El tesoro y el booster siempre aparecen **alejados del punto de inicio** del robot.

### 5. Ejecutar el programa
- Presiona **"Ejecutar programa"** para ver al robot moverse según la secuencia armada.
- Si el robot choca contra un obstáculo, se queda sin energía, o termina la secuencia sin llegar al tesoro, la misión falla.
- Si el robot llega hasta el tesoro y ejecuta el bloque **Tomar**, ¡gana la misión!

### 6. Puntaje, vidas y progreso 🏆
- Cada **tesoro conseguido** otorga **+10 premios**.
- Cada **misión fallida** (chocar con un obstáculo o no llegar al tesoro) resta **-5 premios** y **-1 vida**.
- Si las vidas llegan a **0**, aparece un mensaje de **Game Over** y la partida se reinicia (5 vidas, 0 premios, mapa nuevo).
- Al alcanzar **100 premios**, aparece un mensaje de felicitación indicando que pronto habrá una actualización con más niveles, y la partida se reinicia automáticamente para seguir practicando.

---

## 🛠️ Tecnología

- **HTML5, CSS3 y JavaScript** puro (sin frameworks ni dependencias externas de build).
- **PWA instalable**: incluye `manifest.json` y `service worker` (`sw.js`) con caché de todos los assets para uso offline.
- Diseño responsive: en dispositivos móviles en orientación vertical, el juego rota automáticamente a horizontal para aprovechar el diseño del tablero.

### Estructura del proyecto
```
├── index.html        # Estructura de la interfaz del juego
├── style.css          # Estilos y diseño del tablero/HUD
├── app.js             # Lógica del juego (mapa, bloques, ejecución, HUD)
├── manifest.json       # Configuración de instalación como PWA
├── sw.js              # Service worker (caché offline)
└── assets/            # Imágenes: fondos, bloques, piso, obstáculos, HUD, etc.
```

---

## 📲 Instalación como PWA

1. Abre el juego en el navegador (Chrome, Edge, Safari, etc.).
2. Busca la opción **"Instalar aplicación"** / **"Agregar a pantalla de inicio"** en el menú del navegador.
3. Una vez instalado, Robo Cowboy funcionará como una app independiente, incluso sin conexión a internet.

---

## 👨‍💻 Autor

Creado por **[@joselopantoja](https://wa.me/573142805349)** — contáctame por WhatsApp.

---

## 📄 Licencia

Este proyecto puede distribuirse y modificarse libremente citando al autor original.
