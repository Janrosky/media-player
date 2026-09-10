import './style.css'
import { formatFileSize, importFiles, MEDIA_ACCEPT, revokeEntry } from './media/library.js'

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
        <div class="record" aria-hidden="true"><span>U</span></div>
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
          <span>0:00</span>
          <label class="sr-only" for="progress">Progreso de reproducción</label>
          <input id="progress" type="range" min="0" max="100" value="0" disabled />
          <span>0:00</span>
        </div>
        <div class="volume-row">
          <button class="icon-button small-button" type="button" aria-label="Silenciar" disabled>⌕</button>
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
  if ('webkitdirectory' in folderInput) folderInput.webkitdirectory = true
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
  const playerStatus = document.querySelector('.player-status')

  let libraryEntries = []
  let selectedEntryId = null

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
      playerStatus.textContent = 'Seleccionado'
    } else {
      playerMessage.textContent = 'Selecciona un archivo para reproducirlo'
      playerStatus.textContent = 'En espera'
    }
  }

  function selectEntry(entryId) {
    selectedEntryId = entryId
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
    if (input.files.length === 0) {
      if (options?.isFolder) importStatus.textContent = 'No se encontraron archivos en la carpeta seleccionada.'
      input.value = ''
      return
    }

    const result = importFiles(input.files, libraryEntries, URL.createObjectURL, options)
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

  if (!('webkitdirectory' in folderInput)) {
    addFolderButtons.forEach((button) => {
      button.disabled = true
      button.setAttribute('aria-describedby', 'folder-support-note')
    })
    folderSupportNote.textContent = 'La selección de carpetas no está disponible en este navegador. Añade archivos individuales.'
  }

  renderRows()
