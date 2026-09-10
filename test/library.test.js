import assert from 'node:assert/strict'
import test from 'node:test'
import { getMediaType, importFiles } from '../src/media/library.js'

function syntheticFile(name, type, overrides = {}) {
  return {
    name,
    type,
    size: overrides.size ?? 100,
    lastModified: overrides.lastModified ?? 1,
    webkitRelativePath: overrides.webkitRelativePath ?? '',
  }
}

test('importa audio de carpeta por MIME o extensión y rechaza tipos no válidos', () => {
  const files = [
    syntheticFile('voz.mp3', 'audio/mpeg', { webkitRelativePath: 'musica/voz.mp3' }),
    syntheticFile('sin-mime.ogg', '', { webkitRelativePath: 'musica/sin-mime.ogg' }),
    syntheticFile('binario.flac', 'application/octet-stream', { webkitRelativePath: 'musica/disco/binario.flac' }),
    syntheticFile('video.mp4', 'video/mp4', { webkitRelativePath: 'musica/video.mp4' }),
    syntheticFile('notas.txt', 'text/plain', { webkitRelativePath: 'musica/notas.txt' }),
  ]
  const objectUrls = []

  const result = importFiles(files, [], (file) => {
    objectUrls.push(file.name)
    return `blob:${file.name}`
  }, {
    isFolder: true,
    allowedMediaTypes: new Set(['audio']),
    allowExtensionFallback: true,
  })

  assert.deepEqual(result.summary, { added: 3, duplicates: 0, unsupported: 2 })
  assert.deepEqual(result.entries.map((entry) => entry.relativePath), [
    'musica/voz.mp3',
    'musica/sin-mime.ogg',
    'musica/disco/binario.flac',
  ])
  assert.deepEqual(objectUrls, ['voz.mp3', 'sin-mime.ogg', 'binario.flac'])
})

test('normaliza una colección array-like y omite duplicados por ruta', () => {
  const file = syntheticFile('tema.wav', 'audio/wav', { webkitRelativePath: 'album/tema.wav' })
  const fileListLike = { 0: file, 1: file, length: 2 }
  const firstImport = importFiles(fileListLike, [], () => 'blob:tema')

  assert.equal(firstImport.entries.length, 1)
  assert.deepEqual(firstImport.summary, { added: 1, duplicates: 1, unsupported: 0 })

  const secondImport = importFiles([file], firstImport.entries, () => 'blob:unused')
  assert.deepEqual(secondImport.summary, { added: 0, duplicates: 1, unsupported: 0 })
})

test('solo aplica fallback de extensión cuando se importa una carpeta', () => {
  const file = syntheticFile('tema.mp3', '')

  assert.equal(getMediaType(file, { isFolder: true, allowExtensionFallback: true }), 'audio')
  assert.equal(getMediaType(file, { isFolder: false, allowExtensionFallback: true }), null)
})
