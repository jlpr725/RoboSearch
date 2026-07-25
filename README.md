# 🤖 Factoría en Cuarentena — Edición PWA (Desafío de Bloques)

Un videojuego educativo de programación por bloques y pensamiento computacional, inspirado en la dinámica clásica de los juegos de programación para escuelas (estilo *Coding for Carrots*). Diseñado como una Aplicación Web Progresiva (PWA) ligera, rápida y 100% jugable tanto en ordenadores como en dispositivos móviles, incluso sin conexión a internet[cite: 1].

---

## 🚀 Características Principales

* **Programación Visual por Bloques:** Arrastra o selecciona comandos básicos (Avanzar, Girar a la Derecha/Izquierda), acciones específicas (Tomar Batería) y estructuras condicionales (`SI camino libre`)[cite: 1].
* **Mapas Generados Aleatoriamente:** Cada partida presenta un nuevo desafío procedimental en una cuadrícula de 5x5 casillas con obstáculos dinámicos distribuidos al azar (fuego 🔥, agua 💧, huecos 🕳️)[cite: 1].
* **Sistema de Premios y Penalizaciones:** Acumula premios al completar misiones con éxito. Si el robot cae en un obstáculo, perderá puntos de bonificación, o el juego se reiniciará automáticamente si te quedas sin premios.
* **Diseño Adaptativo (Responsive):** 
  * *En Escritorio:* Distribución horizontal optimizada con un mapa protagonista de gran tamaño.
  * *En Móviles:* El mapa ocupa exactamente el 60% superior de la pantalla y el 40% inferior distribuye de forma proporcional y organizada la paleta de bloques y la secuencia de comandos.
* **Soporte PWA & Offline-First:** Instalable directamente desde el navegador en cualquier dispositivo (Android, iOS, Windows, macOS, Linux) y completamente funcional sin conexión gracias a su *Service Worker*[cite: 1].

---

## 📁 Estructura del Proyecto

El repositorio está compuesto por los siguientes archivos esenciales para el funcionamiento de la PWA:

```text
├── index.html       # Estructura principal de la interfaz y elementos visuales.
├── style.css        # Estilos modernos, diseño adaptativo y animaciones del robot.
├── app.js           # Lógica del juego, motor de ejecución de bloques y gestión de estados.
├── manifest.json    # Configuración de la Aplicación Web Progresiva para instalación.
├── sw.js            # Service Worker para almacenamiento en caché y soporte offline.
├── icon-192.png     # Icono de la PWA (192x192 px).
└── icon-512.png     # Icono de la PWA (512x512 px).
