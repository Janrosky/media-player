export const MEDIA_ACCEPT = 'audio/*,video/*'

const MEDIA_TYPES = new Set(['audio', 'video'])

function getMediaType(file) {
  const mediaType = file.type.split('/')[0]
  return MEDIA_TYPES.has(mediaType) ? mediaType : null
}

function getFileKey(file) {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`
}

export function importFiles(fileList, existingEntries, createObjectURL = URL.createObjectURL) {
  const entries = []
  const existingKeys = new Set(existingEntries.map((entry) => entry.key))
  const summary = {
    added: 0,
    duplicates: 0,
    unsupported: 0,
  }

  for (const file of fileList) {
    const mediaType = getMediaType(file)
    if (!mediaType) {
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