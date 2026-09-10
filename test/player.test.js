import assert from 'node:assert/strict'
import test from 'node:test'
import { createMediaPlayer, formatTime, getAdjacentIndex, PLAYER_STATES } from '../src/media/player.js'

class FakeMediaElement extends EventTarget {
  constructor(type, playResult = 'resolve') {
    super()
    this.type = type
    this.paused = true
    this.ended = false
    this.playResult = playResult
    this.playCalls = 0
    this.pauseCalls = 0
    this.loadCalls = 0
    this.removeCalls = 0
    this.attributes = {}
    this.currentTime = 0
    this.duration = Number.NaN
    this.seekable = { length: 0 }
    this.volume = 1
    this.muted = false
  }

  play() {
    this.playCalls += 1
    if (this.playResult === 'reject') return Promise.reject(new Error('decode rejected'))
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.pauseCalls += 1
    this.paused = true
  }

  load() {
    this.loadCalls += 1
  }

  remove() {
    this.removeCalls += 1
  }

  removeAttribute(attribute) {
    if (attribute === 'src') this.src = ''
  }

  setAttribute(attribute, value) {
    this.attributes[attribute] = value
  }
}

class FakeContainer {
  replaceChildren(element) {
    this.element = element
  }
}

function createHarness(playResult = 'resolve') {
  const container = new FakeContainer()
  const elements = []
  const states = []
  const volumeChanges = []
  const player = createMediaPlayer({
    documentRef: {
      createElement(type) {
        const element = new FakeMediaElement(type, playResult)
        elements.push(element)
        return element
      },
    },
    onStateChange: ({ state, volume, muted }) => {
      states.push(state)
      volumeChanges.push({ volume, muted })
    },
  })
  return { container, elements, player, states, volumeChanges }
}

const audioEntry = { name: 'sample.mp3', mediaType: 'audio', objectUrl: 'blob:audio' }
const videoEntry = { name: 'sample.mp4', mediaType: 'video', objectUrl: 'blob:video' }

test('carga, reproduce y limpia al cambiar de audio a vídeo', async () => {
  const harness = createHarness()

  harness.player.load(audioEntry, harness.container)
  const audio = harness.elements[0]
  assert.equal(audio.type, 'audio')
  assert.equal(audio.src, 'blob:audio')
  assert.equal(audio.loadCalls, 1)
  assert.equal(harness.states.at(-1), PLAYER_STATES.loading)

  audio.dispatchEvent(new Event('canplay'))
  assert.equal(harness.states.at(-1), PLAYER_STATES.ready)
  await harness.player.togglePlayback()
  assert.equal(audio.playCalls, 1)

  harness.player.load(videoEntry, harness.container)
  const video = harness.elements[1]
  assert.equal(audio.pauseCalls, 1)
  assert.equal(audio.loadCalls, 2)
  assert.equal(video.type, 'video')
  assert.equal(video.playsInline, true)
})

test('expone un error recuperable si play rechaza', async () => {
  const harness = createHarness('reject')

  harness.player.load(audioEntry, harness.container)
  await harness.player.togglePlayback()

  assert.equal(harness.states.at(-1), PLAYER_STATES.error)
  assert.equal(harness.elements[0].pauseCalls, 0)
})

test('formatea tiempos y evita mostrar duraciones desconocidas', () => {
  assert.equal(formatTime(0), '0:00')
  assert.equal(formatTime(65.9), '1:05')
  assert.equal(formatTime(3661), '1:01:01')
  assert.equal(formatTime(Number.NaN), '--:--')
  assert.equal(formatTime(Number.POSITIVE_INFINITY), '--:--')
})

test('calcula anterior y siguiente sin índices fuera de la biblioteca', () => {
  assert.equal(getAdjacentIndex(0, -1, 3), -1)
  assert.equal(getAdjacentIndex(0, 1, 3), 1)
  assert.equal(getAdjacentIndex(2, 1, 3), -1)
})

test('solo permite seek con duración y rango buscable', () => {
  const harness = createHarness()
  harness.player.load(audioEntry, harness.container)
  const audio = harness.elements[0]

  assert.equal(harness.player.seek(10), false)
  audio.duration = 120
  audio.seekable = { length: 1 }
  assert.equal(harness.player.seek(150), true)
  assert.equal(audio.currentTime, 120)
})

test('silencia y restaura el volumen anterior', () => {
  const harness = createHarness()
  harness.player.load(audioEntry, harness.container)
  const audio = harness.elements[0]

  harness.player.setVolume(0.35)
  assert.equal(audio.volume, 0.35)
  assert.equal(harness.player.toggleMute(), true)
  assert.equal(audio.muted, true)
  assert.equal(harness.player.toggleMute(), false)
  assert.equal(audio.muted, false)
  assert.equal(audio.volume, 0.35)
})

test('sincroniza cambios externos de volumen y silencio mediante volumechange', () => {
  const harness = createHarness()
  harness.player.load(audioEntry, harness.container)
  const audio = harness.elements[0]

  audio.volume = 0.42
  audio.muted = true
  audio.dispatchEvent(new Event('volumechange'))

  assert.deepEqual(harness.volumeChanges.at(-1), { volume: 0.42, muted: true })

  audio.muted = false
  audio.dispatchEvent(new Event('volumechange'))
  assert.deepEqual(harness.volumeChanges.at(-1), { volume: 0.42, muted: false })
  assert.equal(harness.player.toggleMute(), true)
  assert.equal(audio.muted, true)
  assert.equal(harness.player.toggleMute(), false)
  assert.equal(audio.volume, 0.42)
})