export const MEDIA_ACCEPT = 'audio/*,video/*'

const MEDIA_TYPES = new Set(['audio', 'video'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba', 'wma', 'alac'])
const EXTENSION_FALLBACK_MIME_TYPES = new Set(['', 'application/octet-stream'])

export function getMediaType(file, options = {}) {
  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  const mediaType = mimeType.split('/')[0]
  if (MEDIA_TYPES.has(mediaType)) return mediaType
  if (
    options.isFolder &&
    options.allowExtensionFallback &&
    EXTENSION_FALLBACK_MIME_TYPES.has(mimeType) &&
    AUDIO_EXTENSIONS.has(getFileExtension(file.name))
  ) return 'audio'
  return null
}

function getFileExtension(fileName) {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  return extension === fileName.toLowerCase() ? '' : extension
}

function getFileKey(file) {
  const relativePath = file.webkitRelativePath ? `${file.webkitRelativePath}\u0000` : ''
  return `${relativePath}${file.name}\u0000${file.size}\u0000${file.lastModified}`
}

export function importFiles(fileList, existingEntries, createObjectURL = URL.createObjectURL, options = {}) {
  const allowedMediaTypes = options.allowedMediaTypes ?? MEDIA_TYPES
  const entries = []
  const existingKeys = new Set(existingEntries.map((entry) => entry.key))
  const summary = {
    added: 0,
    duplicates: 0,
    unsupported: 0,
  }

  for (const file of Array.from(fileList ?? [])) {
    const mediaType = getMediaType(file, options)
    if (!mediaType || !allowedMediaTypes.has(mediaType)) {
      summary.unsupported += 1
      continue
    }

    const key = getFileKey(file)
    if (existingKeys.has(key)) {
      summary.duplicates += 1
      continue
    }

    existingKeys.add(key)
    entries.push({
      id: crypto.randomUUID(),
      key,
      file,
      name: file.name,
      relativePath: file.webkitRelativePath || '',
      mime: file.type,
      mediaType,
      size: file.size,
      objectUrl: createObjectURL(file),
    })
    summary.added += 1
  }

  return { entries, summary }
}

export function revokeEntry(entry, revokeObjectURL = URL.revokeObjectURL) {
  revokeObjectURL(entry.objectUrl)
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}