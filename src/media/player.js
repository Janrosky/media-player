const MEDIA_EVENTS = ['play', 'playing', 'pause', 'ended', 'loadedmetadata', 'durationchange', 'timeupdate', 'canplay', 'waiting', 'volumechange', 'error']

export const PLAYER_STATES = Object.freeze({
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  playing: 'playing',
  paused: 'paused',
  ended: 'ended',
  error: 'error',
})

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainder = totalSeconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function getAdjacentIndex(currentIndex, direction, length) {
  const nextIndex = currentIndex + direction
  return nextIndex >= 0 && nextIndex < length ? nextIndex : -1
}

export function createMediaPlayer({ documentRef = document, onStateChange = () => {}, onTimeUpdate = () => {}, onEnded = () => {}, initialVolume = 0.7 } = {}) {
  let mediaElement = null
  let currentEntry = null
  let state = PLAYER_STATES.idle
  let loadVersion = 0
  let volume = Math.min(1, Math.max(0, initialVolume))
  let volumeBeforeMute = volume || 0.7

  function notify(nextState, error = null) {
    state = nextState
    onStateChange({
      state,
      entry: currentEntry,
      error,
      volume: mediaElement?.volume ?? volume,
      muted: mediaElement?.muted ?? false,
    })
  }

  function handleMediaEvent(event, version) {
    if (version !== loadVersion || !mediaElement) return

    if (event.type === 'timeupdate' || event.type === 'durationchange' || event.type === 'loadedmetadata') {
      onTimeUpdate({ currentTime: mediaElement.currentTime, duration: mediaElement.duration, seekable: mediaElement.seekable, entry: currentEntry })
    }

    if (event.type === 'volumechange') {
      volume = mediaElement.volume
      if (!mediaElement.muted && volume > 0) volumeBeforeMute = volume
      onStateChange({ state, entry: currentEntry, error: null, volume, muted: mediaElement.muted })
      return
    }

    const eventStates = {
      play: PLAYER_STATES.playing,
      playing: PLAYER_STATES.playing,
      pause: PLAYER_STATES.paused,
      ended: PLAYER_STATES.ended,
      loadedmetadata: PLAYER_STATES.ready,
      canplay: PLAYER_STATES.ready,
      waiting: PLAYER_STATES.loading,
    }

    if (event.type === 'error') {
      notify(PLAYER_STATES.error, mediaElement.error)
      return
    }

    if (eventStates[event.type]) notify(eventStates[event.type])
    if (event.type === 'ended') onEnded({ entry: currentEntry })
  }

  function detachMediaElement() {
    if (!mediaElement) return
    MEDIA_EVENTS.forEach((eventName) => mediaElement.removeEventListener(eventName, mediaElement.eventHandlers[eventName]))
    mediaElement.pause()
    mediaElement.removeAttribute('src')
    mediaElement.load()
    mediaElement.remove()
    mediaElement = null
  }

  function load(entry, container) {
    loadVersion += 1
    detachMediaElement()
    currentEntry = entry

    const element = documentRef.createElement(entry.mediaType)
    const version = loadVersion
    element.className = `media-element media-${entry.mediaType}`
    element.setAttribute('aria-label', `${entry.mediaType === 'audio' ? 'Audio' : 'Vídeo'}: ${entry.name}`)
    element.controls = false
    element.preload = 'metadata'
    element.volume = volume
    element.muted = false
    if (entry.mediaType === 'video') element.playsInline = true

    element.eventHandlers = Object.fromEntries(MEDIA_EVENTS.map((eventName) => [
      eventName,
      (event) => handleMediaEvent(event, version),
    ]))
    MEDIA_EVENTS.forEach((eventName) => element.addEventListener(eventName, element.eventHandlers[eventName]))

    mediaElement = element
    container.replaceChildren(element)
    notify(PLAYER_STATES.loading)
    element.src = entry.objectUrl
    element.load()
  }

  async function togglePlayback() {
    if (!mediaElement) return
    if (mediaElement.paused || mediaElement.ended) {
      try {
        await mediaElement.play()
      } catch (error) {
        notify(PLAYER_STATES.error, error)
      }
      return
    }
    mediaElement.pause()
  }

  function canSeek() {
    return Boolean(mediaElement && Number.isFinite(mediaElement.duration) && mediaElement.duration > 0 && mediaElement.seekable?.length > 0)
  }

  function seek(seconds) {
    if (!canSeek()) return false
    const nextTime = Math.min(mediaElement.duration, Math.max(0, Number(seconds)))
    if (!Number.isFinite(nextTime)) return false
    mediaElement.currentTime = nextTime
    onTimeUpdate({ currentTime: mediaElement.currentTime, duration: mediaElement.duration, seekable: mediaElement.seekable, entry: currentEntry })
    return true
  }

  function setVolume(nextVolume) {
    const parsedVolume = Number(nextVolume)
    volume = Number.isFinite(parsedVolume) ? Math.min(1, Math.max(0, parsedVolume)) : volume
    if (volume > 0) volumeBeforeMute = volume
    if (mediaElement) {
      mediaElement.volume = volume
      if (volume > 0) mediaElement.muted = false
    }
  }

  function toggleMute() {
    if (!mediaElement) return false
    if (mediaElement.muted) {
      setVolume(volume || volumeBeforeMute)
      mediaElement.muted = false
    } else {
      if (volume > 0) volumeBeforeMute = volume
      mediaElement.muted = true
    }
    return mediaElement.muted
  }

  function clear() {
    loadVersion += 1
    detachMediaElement()
    currentEntry = null
    notify(PLAYER_STATES.idle)
  }

  return {
    clear,
    get state() {
      return state
    },
    load,
    seek,
    setVolume,
    toggleMute,
    togglePlayback,
  }
}