# 🤖 CodeBot: Laberinto Cuántico (PWA)

> Una aplicación web progresiva (PWA) interactiva y educativa diseñada para enseñar y poner a prueba la **lógica de programación, el pensamiento computacional y la optimización de código** a través de la resolución de laberintos tácticos.

---

## 🌟 ¿Por qué este juego?

Aprender a programar mediante la escritura directa de código puede ser abstracto y frustrante para principiantes. **CodeBot** transforma los conceptos fundamentales de la programación (secuencias, condicionales, bucles anidados y gestión de recursos) en un juego visual, dinámico y gamificado. 

El objetivo principal no es solo llegar a la meta, sino **escribir código eficiente**:
* **Optimización con Bucles:** Usar bloques multiplicadores (`x2`, `x3`, `x4`) reduce el consumo de energía a la mitad, recompensando al jugador por pensar en código limpio y reutilizable.
* **Pensamiento Lógico:** Evaluar caminos libres con condicionales y sortear obstáculos complejos mediante saltos precisos.
* **Accesibilidad Offline-First:** Al ser una PWA, los estudiantes o entusiastas pueden jugar en cualquier lugar sin necesidad de una conexión constante a internet.

---

## 🎮 Características Principales

* **Interfaz Visual Intuitiva (Drag & Drop):** Arrastra bloques de comandos o anídanos dentro de bucles de manera fluida.
* **Mapa Protagonista (70% de pantalla):** Un diseño centrado en la acción donde la simulación del robot es el foco principal, optimizado tanto para escritorios como para dispositivos móviles.
* **Sistema de Vidas y Recompensas:** Gestiona tus 5 corazones ❤️, acumula premios 🎁 y ahorra energía ⚡ tomando decisiones inteligentes.
* **Diseño Moderno e Industrial:** Una paleta de colores oscura estilo consola de programación, con animaciones fluidas y diseño responsivo para celulares.
* **Soporte PWA / Offline:** Funciona como una aplicación nativa instalable gracias a su Service Worker.

---

## 🧩 ¿Cómo Jugar?

1. **Arrastra tus bloques:** Selecciona acciones de movimiento (Avanzar, Girar, Saltar, Tomar) desde la paleta hacia el área de secuencia.
2. **Optimiza con Bucles:** Arrastra un bloque repetidor (`x2`, `x3`, `x4`) y coloca una acción dentro de él para multiplicarla ahorrando batería.
3. **Ejecuta la misión:** Presiona el botón de **Play (▶)** para ver al robot ejecutar tu código paso a paso en el mapa de 5x5.
4. **Corrige sobre la marcha:** ¿Te equivocaste? Haz clic en cualquier bloque de tu secuencia para eliminarlo individualmente sin perder tu progreso ni reiniciar el mapa.

---

## 🛠️ Tecnologías Utilizadas

Este proyecto fue desarrollado utilizando tecnologías web modernas sin dependencias pesadas (Vanilla Stack):
* **HTML5 Semantic & Drag and Drop API** (Para la manipulación e interfaz de bloques).
* **CSS3 Grid & Flexbox** (Para el diseño adaptable y distribución 70/30).
* **JavaScript (ES6+)** (Para el motor de estados, bucles y lógica de simulación asíncrona).
* **Service Workers & Web Manifest** (Para las capacidades de Progressive Web App y funcionamiento offline).

---

## 🚀 Instalación y Uso Local

Si deseas clonar y probar este proyecto en tu entorno local:

1. Clona el repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
