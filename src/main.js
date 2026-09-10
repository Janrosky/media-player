import './style.css'
import { formatFileSize, importFiles, MEDIA_ACCEPT, revokeEntry } from './media/library.js'
import { createMediaPlayer, formatTime, getAdjacentIndex, PLAYER_STATES } from './media/player.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="/" aria-label="Umbral, inicio">
      <span class="brand-mark" aria-hidden="true">U</span>
      <span>
        <strong>Umbral</strong>
        <small>reproductor local</small>
      </span>
    </a>
    <div class="header-actions">
      <p class="privacy-note"><span class="privacy-dot" aria-hidden="true"></span> Tus archivos no salen de este dispositivo</p>
      <button class="button button-primary add-files-button" type="button" aria-describedby="import-status">
        <span aria-hidden="true">+</span>
        Añadir archivos
      </button>
      <button class="button button-secondary add-folder-button" type="button" aria-describedby="folder-support-note import-status">
        <span aria-hidden="true">+</span>
        Añadir carpeta
      </button>
      <input id="media-input" class="sr-only" type="file" multiple accept="${MEDIA_ACCEPT}" />
      <input id="folder-input" class="sr-only" type="file" multiple webkitdirectory />
      <p id="folder-support-note" class="sr-only">Selecciona una carpeta completa. Sus archivos permanecen en este dispositivo.</p>
    </div>
  </header>

  <main class="workspace">
    <section class="library-panel" aria-labelledby="library-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Tu espacio</p>
          <h1 id="library-title">Biblioteca</h1>
        </div>
        <span class="count" aria-label="0 archivos">0</span>
      </div>
      <div class="empty-state empty-library">
        <span class="empty-icon" aria-hidden="true">+</span>
        <h2>Aún no hay archivos</h2>
        <p>Añade música o vídeo, o una carpeta completa de música. Tus archivos permanecen en este dispositivo.</p>
        <button class="button button-secondary add-files-button" type="button">Añadir archivos</button>
        <button class="button button-secondary add-folder-button" type="button" aria-describedby="folder-support-note import-status">Añadir carpeta</button>
      </div>
      <ul class="media-list library-list" aria-label="Archivos de la biblioteca" hidden></ul>
      <div class="library-footer">
        <span class="library-total">0 archivos</span>
        <button class="text-button clear-library-button" type="button" disabled>Limpiar biblioteca</button>
      </div>
      <p id="import-status" class="import-status" role="status" aria-live="polite"></p>
    </section>

    <section class="player-panel" aria-labelledby="player-title">
      <div class="section-heading player-heading">
        <div>
          <p class="eyebrow">Ahora suena</p>
          <h2 id="player-title">Reproductor</h2>
        </div>
        <span class="status-label"><span class="status-dot" aria-hidden="true"></span><span class="player-status">En espera</span></span>
      </div>
      <div class="player-empty" aria-live="polite">
        <div class="media-region">
          <div class="record" aria-hidden="true"><span>U</span></div>
          <div class="media-element-container"></div>
        </div>
        <p class="player-message">Selecciona un archivo para reproducirlo</p>
        <p class="player-submessage">Elige una pista de tu biblioteca cuando esté lista.</p>
      </div>
      <div class="player-controls" aria-label="Controles de reproducción">
        <div class="transport-controls">
          <button class="icon-button" type="button" aria-label="Archivo anterior" disabled>⏮</button>
          <button class="play-button" type="button" aria-label="Reproducir" disabled>▶</button>
          <button class="icon-button" type="button" aria-label="Archivo siguiente" disabled>⏭</button>
        </div>
        <div class="timeline-row">
          <span class="current-time">0:00</span>
          <label class="sr-only" for="progress">Progreso de reproducción</label>
          <input id="progress" type="range" min="0" max="0" value="0" step="0.1" aria-label="Progreso de reproducción" disabled />
          <span class="duration-time">--:--</span>
        </div>
        <div class="volume-row">
          <button class="icon-button small-button mute-button" type="button" aria-label="Silenciar" disabled>⌕</button>
          <label class="sr-only" for="volume">Volumen</label>
          <input id="volume" type="range" min="0" max="100" value="70" disabled />
        </div>
      </div>
    </section>

    <section class="queue-panel" aria-labelledby="queue-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">A continuación</p>
          <h2 id="queue-title">Cola</h2>
        </div>
        <span class="queue-count">0</span>
      </div>
      <div class="empty-state empty-queue" aria-live="polite">
        <span class="queue-icon" aria-hidden="true">≡</span>
        <h2>La cola está vacía</h2>
        <p>Los archivos que elijas aparecerán aquí.</p>
      </div>
      <ul class="media-list queue-list" aria-label="Archivos de la cola" hidden></ul>
    </section>
  </main>

  <footer class="site-footer">
    <span>UMBRAL / SESIÓN LOCAL</span>
    <span>Sin cuenta · Sin nube · Sin rastreo</span>
  </footer>
`

  const fileInput = document.querySelector('#media-input')
  const folderInput = document.querySelector('#folder-input')
  const folderPickerSupported = 'webkitdirectory' in folderInput
  if (folderPickerSupported) folderInput.webkitdirectory = true
  const addFilesButtons = document.querySelectorAll('.add-files-button')
  const addFolderButtons = document.querySelectorAll('.add-folder-button')
  const folderSupportNote = document.querySelector('#folder-support-note')
  const clearLibraryButton = document.querySelector('.clear-library-button')
  const importStatus = document.querySelector('#import-status')
  const libraryList = document.querySelector('.library-list')
  const queueList = document.querySelector('.queue-list')
  const emptyLibrary = document.querySelector('.empty-library')
  const emptyQueue = document.querySelector('.empty-queue')
  const count = document.querySelector('.count')
  const queueCount = document.querySelector('.queue-count')
  const libraryTotal = document.querySelector('.library-total')
  const playerMessage = document.querySelector('.player-message')
  const playerSubmessage = document.querySelector('.player-submessage')
  const playerStatus = document.querySelector('.player-status')
  const playButton = document.querySelector('.play-button')
  const mediaRegion = document.querySelector('.media-region')
  const mediaElementContainer = document.querySelector('.media-element-container')
  const previousButton = document.querySelector('.transport-controls .icon-button:first-child')
  const nextButton = document.querySelector('.transport-controls .icon-button:last-child')
  const progress = document.querySelector('#progress')
  const currentTime = document.querySelector('.current-time')
  const durationTime = document.querySelector('.duration-time')
  const muteButton = document.querySelector('.mute-button')
  const volumeInput = document.querySelector('#volume')

  let libraryEntries = []
  let selectedEntryId = null

  function selectedIndex() {
    return libraryEntries.findIndex((entry) => entry.id === selectedEntryId)
  }

  function updateTransportButtons() {
    const index = selectedIndex()
    previousButton.disabled = index <= 0
    nextButton.disabled = index < 0 || index >= libraryEntries.length - 1
  }

  const playerStateLabels = {
    [PLAYER_STATES.idle]: 'En espera',
    [PLAYER_STATES.loading]: 'Cargando',
    [PLAYER_STATES.ready]: 'Listo',
    [PLAYER_STATES.playing]: 'Reproduciendo',
    [PLAYER_STATES.paused]: 'Pausado',
    [PLAYER_STATES.ended]: 'Finalizado',
    [PLAYER_STATES.error]: 'Error',
  }

  function updateVolumeControls(volume, muted) {
    if (!Number.isFinite(volume)) return
    volumeInput.value = String(Math.min(100, Math.max(0, volume * 100)))
    muteButton.textContent = muted ? '🔇' : '🔊'
    muteButton.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar')
  }

  const player = createMediaPlayer({
    onStateChange: ({ state, entry, volume, muted }) => {
      playerStatus.textContent = playerStateLabels[state]
      playButton.disabled = !entry
      const isPlaying = state === PLAYER_STATES.playing
      playButton.textContent = isPlaying ? '⏸' : '▶'
      playButton.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir')
      progress.disabled = !entry || progress.max === '0'
      muteButton.disabled = !entry
      volumeInput.disabled = !entry
      updateVolumeControls(volume, muted)
      updateTransportButtons()
      if (!entry) {
        currentTime.textContent = '0:00'
        durationTime.textContent = '--:--'
        progress.max = '0'
        progress.value = '0'
      }
      mediaRegion.classList.toggle('has-video', entry?.mediaType === 'video')
      if (state === PLAYER_STATES.error) {
        playerSubmessage.textContent = 'No se pudo decodificar este archivo. Puedes elegir otro o reintentarlo.'
      } else if (entry) {
        playerSubmessage.textContent = playerStateLabels[state]
      }
    },
    onTimeUpdate: ({ currentTime: elapsed, duration, seekable }) => {
      const hasDuration = Number.isFinite(duration) && duration > 0
      const canSeek = hasDuration && seekable?.length > 0
      currentTime.textContent = formatTime(elapsed)
      durationTime.textContent = formatTime(duration)
      progress.max = hasDuration ? String(duration) : '0'
      progress.value = hasDuration ? String(Math.min(duration, Math.max(0, elapsed || 0))) : '0'
      progress.disabled = !canSeek
    },
    onEnded: () => {
      const nextIndex = getAdjacentIndex(selectedIndex(), 1, libraryEntries.length)
      if (nextIndex === -1) {
        playerSubmessage.textContent = 'Fin de la cola.'
        updateTransportButtons()
        return
      }
      selectEntry(libraryEntries[nextIndex].id, { autoplay: true })
    },
  })

  function updateSummary(summary) {
    const messages = []
    if (summary.added > 0) messages.push(`${summary.added} ${summary.added === 1 ? 'archivo añadido' : 'archivos añadidos'}`)
    if (summary.duplicates > 0) messages.push(`${summary.duplicates} ${summary.duplicates === 1 ? 'duplicado omitido' : 'duplicados omitidos'}`)
    if (summary.unsupported > 0) messages.push(`${summary.unsupported} ${summary.unsupported === 1 ? 'archivo no compatible' : 'archivos no compatibles'}`)
    importStatus.textContent = messages.length > 0 ? `${messages.join('. ')}.` : 'No se seleccionaron archivos.'
  }

  function createMediaRow(entry) {
    const row = document.createElement('li')
    const button = document.createElement('button')
    const name = document.createElement('span')
    const metadata = document.createElement('span')

    row.className = 'media-row'
    button.className = 'media-row-button'
    button.type = 'button'
    button.dataset.entryId = entry.id
    button.setAttribute('aria-label', `Seleccionar ${entry.name}`)
    name.className = 'media-name'
    name.textContent = entry.name
    if (entry.relativePath) button.title = entry.relativePath
    metadata.className = 'media-metadata'
    metadata.textContent = `${entry.mediaType === 'audio' ? 'Audio' : 'Vídeo'} · ${formatFileSize(entry.size)}`
    button.append(name, metadata)
    row.append(button)
    return row
  }

  function renderRows() {
    const hasEntries = libraryEntries.length > 0
    const selectedEntry = libraryEntries.find((entry) => entry.id === selectedEntryId)

    libraryList.replaceChildren(...libraryEntries.map(createMediaRow))
    queueList.replaceChildren(...libraryEntries.map(createMediaRow))
    libraryList.hidden = !hasEntries
    queueList.hidden = !hasEntries
    emptyLibrary.hidden = hasEntries
    emptyQueue.hidden = hasEntries
    clearLibraryButton.disabled = !hasEntries
    count.textContent = String(libraryEntries.length)
    count.setAttribute('aria-label', `${libraryEntries.length} ${libraryEntries.length === 1 ? 'archivo' : 'archivos'}`)
    queueCount.textContent = String(libraryEntries.length)
    libraryTotal.textContent = `${libraryEntries.length} ${libraryEntries.length === 1 ? 'archivo' : 'archivos'}`

    document.querySelectorAll('.media-row-button').forEach((rowButton) => {
      const isSelected = rowButton.dataset.entryId === selectedEntryId
      rowButton.classList.toggle('is-selected', isSelected)
      rowButton.setAttribute('aria-pressed', String(isSelected))
    })

    if (selectedEntry) {
      playerMessage.textContent = selectedEntry.name
    } else {
      playerMessage.textContent = 'Selecciona un archivo para reproducirlo'
    }
  }

  function selectEntry(entryId, options = {}) {
    selectedEntryId = entryId
    const selectedEntry = libraryEntries.find((entry) => entry.id === entryId)
    if (selectedEntry) {
      player.load(selectedEntry, mediaElementContainer)
      if (options.autoplay) player.togglePlayback()
    }
    renderRows()
  }

  function handleRowSelection(event) {
    const rowButton = event.target.closest('.media-row-button')
    if (rowButton) selectEntry(rowButton.dataset.entryId)
  }

  function openFilePicker() {
    fileInput.click()
  }

  function openFolderPicker() {
    folderInput.click()
  }

  function handleFileSelection(input, options) {
    const files = Array.from(input.files ?? [])
    if (files.length === 0) {
      if (options?.isFolder) importStatus.textContent = 'No se encontraron archivos en la carpeta seleccionada.'
      input.value = ''
      return
    }

    const result = importFiles(files, libraryEntries, URL.createObjectURL, options)
    libraryEntries = libraryEntries.concat(result.entries)
    renderRows()
    if (options?.isFolder && result.summary.added === 0 && result.summary.duplicates === 0 && result.summary.unsupported > 0) {
      importStatus.textContent = 'No se encontraron archivos de audio compatibles en la carpeta seleccionada.'
    } else {
      updateSummary(result.summary)
    }
    input.value = ''
  }

  function clearLibrary() {
    player.clear()
    libraryEntries.forEach((entry) => revokeEntry(entry))
    libraryEntries = []
    selectedEntryId = null
    renderRows()
    importStatus.textContent = 'Biblioteca limpiada.'
    document.querySelector('.add-files-button').focus()
  }

  addFilesButtons.forEach((button) => button.addEventListener('click', openFilePicker))
  addFolderButtons.forEach((button) => button.addEventListener('click', openFolderPicker))
  fileInput.addEventListener('change', () => handleFileSelection(fileInput))
  folderInput.addEventListener('change', () => handleFileSelection(folderInput, {
    allowedMediaTypes: new Set(['audio']),
    allowExtensionFallback: true,
    isFolder: true,
  }))
  libraryList.addEventListener('click', handleRowSelection)
  queueList.addEventListener('click', handleRowSelection)
  clearLibraryButton.addEventListener('click', clearLibrary)
  playButton.addEventListener('click', () => player.togglePlayback())
  previousButton.addEventListener('click', () => {
    const index = getAdjacentIndex(selectedIndex(), -1, libraryEntries.length)
    if (index !== -1) selectEntry(libraryEntries[index].id)
  })
  nextButton.addEventListener('click', () => {
    const index = getAdjacentIndex(selectedIndex(), 1, libraryEntries.length)
    if (index !== -1) selectEntry(libraryEntries[index].id)
  })
  progress.addEventListener('input', () => player.seek(progress.value))
  volumeInput.addEventListener('input', () => player.setVolume(Number(volumeInput.value) / 100))
  muteButton.addEventListener('click', () => {
    player.toggleMute()
  })

  if (!folderPickerSupported) {
    folderSupportNote.textContent = 'La selección de carpetas no está disponible en este navegador. El selector se abrirá como selección de archivos; añade archivos individuales.'
  }

  renderRows()
