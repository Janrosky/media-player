# Orbixa Player

Reproductor multimedia web **local-first** para escuchar audio y reproducir vídeo desde archivos que eliges en tu propio dispositivo. Orbixa Player está construido con Vite, Vanilla JavaScript, HTML y CSS, con una interfaz premium y responsive alineada con Orbixa Downloader.

[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=111111)](https://developer.mozilla.org/docs/Web/JavaScript)

## Propuesta de valor

Orbixa Player trata tus archivos como archivos locales: los seleccionas explícitamente, se crean referencias temporales en el navegador y puedes reproducirlos sin subirlos a un servidor.

Sus principios son:

- **Local-first y privacidad:** no hay backend, cuentas, nube ni sincronización.
- **Simplicidad modular:** la biblioteca, el reproductor y la presentación tienen responsabilidades claras.
- **Estándares web:** usa File API, object URLs, elementos HTML de audio/vídeo y ES Modules.
- **Experiencia premium:** una interfaz cuidada, accesible y adaptable sin copiar interfaces ni recursos propietarios de Apple, Spotify o YouTube Music.

## Vista previa

No se incluye una captura fija en el repositorio. Para ver la interfaz funcionando, inicia el servidor de desarrollo:

```bash
npm install
npm run dev
```

Abre la URL local que muestre Vite y añade archivos de audio o vídeo desde tu dispositivo. La biblioteca se construye solo durante la sesión actual.

## Funcionalidades actuales

- Importación explícita de archivos de audio y vídeo.
- Selección de una carpeta completa en navegadores Chromium mediante `webkitdirectory`.
- “Añadir carpeta” recorre las subcarpetas e incorpora solo archivos de audio; los vídeos y los tipos no compatibles se descartan y se informan.
- Biblioteca temporal con detección de duplicados y descarte de tipos no compatibles.
- Selección de entradas y reproducción de audio o vídeo.
- Play/pause, archivo anterior y siguiente.
- Reproducción automática del siguiente archivo cuando termina el actual.
- Barra de progreso, seek, tiempo transcurrido y duración.
- Control de volumen, silencio y restauración del volumen anterior.
- Estados de carga, reproducción, pausa, finalización y error recuperable.
- Limpieza de elementos multimedia y revocación de object URLs al retirar recursos.

## Roadmap futuro

Estas ideas no forman parte de la funcionalidad actual y necesitan diseño, implementación y validación antes de considerarse comprometidas:

1. Persistencia local opcional de la biblioteca, con límites y controles claros para el usuario.
2. Mejoras de navegación y ordenación para bibliotecas grandes.
3. Atajos de teclado y preferencias de reproducción.
4. Metadatos y carátulas cuando puedan obtenerse de forma local y respetuosa con la privacidad.
5. Más pruebas de integración entre la UI, la biblioteca y los elementos multimedia reales.

## Compatibilidad y limitaciones

- La prioridad de compatibilidad es **Chrome, Edge y Brave basados en Chromium**.
- La selección de carpetas depende de `webkitdirectory`, una capacidad con disponibilidad principalmente Chromium. En navegadores que no la expongan, usa **Añadir archivos**.
- La compatibilidad de codecs no la decide Orbixa Player: depende del navegador, el sistema operativo y los códecs disponibles. Un archivo admitido por su extensión o MIME puede no decodificarse.
- Algunos archivos pueden tener MIME vacío o genérico al seleccionarse desde una carpeta; el proyecto aplica un fallback limitado para extensiones de audio conocidas en ese flujo.
- La biblioteca es temporal y se pierde al recargar o cerrar la página. No existe persistencia entre sesiones.
- Los navegadores pueden bloquear la reproducción automática con sonido según sus políticas; en ese caso, inicia la reproducción con el control de play.
- No se promete compatibilidad con todos los formatos, navegadores o dispositivos.

## Inicio rápido

### Requisitos

- Node.js con npm.
- Un navegador moderno. Para seleccionar carpetas, usa un navegador basado en Chromium.

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Inicia Vite en modo desarrollo con recarga durante los cambios.

### Tests

```bash
npm test
```

Ejecuta las pruebas con el runner integrado de Node para la biblioteca y el reproductor.

### Build de producción

```bash
npm run build
```

Genera la salida de producción de Vite.

### Preview de la build

```bash
npm run preview
```

Sirve localmente la build generada para comprobarla antes de compartirla o desplegarla.

## Arquitectura

```text
.
├── index.html                 # Punto de entrada HTML
├── package.json               # Scripts y dependencia de desarrollo
├── public/                    # Recursos públicos estáticos
├── src/
│   ├── main.js                # Composición de la UI y eventos de la aplicación
│   ├── style.css              # Sistema visual, layout y responsive
│   ├── counter.js              # Módulo heredado del starter de Vite
│   ├── assets/                # Recursos del frontend
│   └── media/
│       ├── library.js         # Importación, filtrado y ciclo de vida de archivos
│       └── player.js          # Estados, reproducción, seek y volumen
└── test/
    ├── library.test.js        # Pruebas de importación y clasificación
    └── player.test.js         # Pruebas del comportamiento del reproductor
```

## Flujo de importación y reproducción

1. El usuario selecciona archivos o una carpeta desde el selector del navegador.
2. Orbixa Player recibe los objetos `File`, conserva la ruta relativa cuando existe y filtra los tipos admitidos; “Añadir carpeta” acepta solo archivos de audio y descarta e informa los vídeos y tipos no compatibles.
3. Cada entrada aceptada recibe una object URL temporal y se añade a la biblioteca de la sesión; los duplicados se omiten.
4. Al seleccionar una entrada, el reproductor crea un elemento `audio` o `video`, carga su object URL y muestra su estado.
5. Los eventos nativos actualizan el tiempo, la duración, el progreso, el volumen y los errores.
6. Al finalizar, Orbixa Player selecciona el siguiente elemento disponible y puede reproducirlo automáticamente.
7. Al limpiar o descartar la biblioteca, se detienen los elementos anteriores y se revocan las object URLs de sus entradas para liberar referencias temporales. Cambiar la pista seleccionada no revoca la URL, porque la entrada anterior sigue en la biblioteca.

## Privacidad y seguridad

- Los archivos se procesan en el navegador y **no se suben a un servidor**.
- La selección usa la File API; el navegador no concede acceso general al sistema de archivos.
- Las object URLs son referencias temporales para la sesión, no copias persistentes ni enlaces públicos.
- Las object URLs se crean para las entradas aceptadas y se revocan al limpiar o descartar la biblioteca; cambiar la pista seleccionada no las revoca mientras sus entradas sigan en la biblioteca.
- Los nombres y rutas relativas se muestran como texto de interfaz; no se interpretan como HTML.
- El proyecto no carga código remoto autoactualizable ni necesita cuentas, tokens o credenciales.
- La privacidad del dispositivo y del navegador sigue dependiendo de su configuración, extensiones y del entorno donde se ejecute la aplicación.

## Contribuir

1. Haz un fork del repositorio y crea una rama descriptiva desde la rama principal.
2. Mantén el cambio pequeño y centrado en un comportamiento o mejora concreta.
3. Conserva la arquitectura de ES Modules y el estilo Vanilla JavaScript, HTML y CSS existente.
4. Añade o actualiza pruebas cuando cambie una regla de importación, reproducción, navegación o manejo de errores.
5. Ejecuta `npm test` y `npm run build` antes de abrir el cambio.
6. Usa commits claros y abre un Pull Request con el problema, la solución, las pruebas ejecutadas y las limitaciones conocidas.

No se impone un código de conducta en este momento. Mantén una colaboración técnica respetuosa y describe cualquier decisión discutible en el Pull Request.

## Ideas de contribución priorizadas

- **Prioridad alta:** pruebas de regresión para errores de decodificación, limpieza de recursos y casos límite de importación.
- **Prioridad alta:** accesibilidad de controles, foco de teclado y mensajes de estado.
- **Prioridad media:** ordenación, filtrado y navegación en bibliotecas grandes.
- **Prioridad media:** compatibilidad documentada con más combinaciones de navegador, sistema y codec.
- **Prioridad exploratoria:** persistencia local opcional y preferencias de reproducción.

Para elegir una tarea, empieza por un problema reproducible y acotado, revisa si ya existe una prueba relacionada y confirma en el Pull Request cualquier cambio de alcance. En una mejora de compatibilidad, incluye navegador, sistema, formato del archivo y resultado observado.

## Fuera de alcance y decisiones técnicas

Orbixa Player se centra en reproducir archivos que el usuario selecciona localmente. Por diseño, no incluye:

- Descargas desde YouTube, SoundCloud u otras plataformas.
- Extracción de streams o resolución de URLs remotas.
- Conversión o transcodificación de archivos.
- Proxy CORS ni servicios backend para recuperar medios.
- Módulos remotos autoactualizables.
- Cuentas, base de datos, sincronización o almacenamiento persistente entre sesiones.

La decisión de usar Vanilla JavaScript y ES Modules mantiene pequeño el runtime y hace explícita la separación entre biblioteca, reproducción y UI. Vite aporta el servidor de desarrollo y el build sin introducir React, Vue o Angular.

## Licencia

**Licencia pendiente de definir.** Hasta que el proyecto publique una licencia, no se debe asumir autorización para redistribuirlo más allá de la revisión, uso personal y colaboración permitidas por el repositorio.

## Participa

Orbixa Player todavía está evolucionando. Las mejoras más útiles son concretas, reproducibles y respetuosas con el carácter local-first del proyecto: una prueba que capture un caso real, una mejora de accesibilidad o una corrección bien explicada puede ser un excelente primer Pull Request.
