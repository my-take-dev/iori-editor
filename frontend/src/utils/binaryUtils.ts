/**
 * Binary file extension detection utilities
 */

/**
 * Set of file extensions that are considered binary
 */
export const BINARY_EXTENSIONS = new Set([
  // Executables and libraries
  'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a', 'lib',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg', 'tiff', 'tif',
  // Audio/Video
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'ogg',
  // Archives
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  // Fonts
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  // Databases
  'db', 'sqlite', 'sqlite3',
  // Compiled code
  'class', 'pyc', 'pyo',
  // WebAssembly
  'wasm',
])

/**
 * Check if a file is binary based on its extension
 */
export function isBinaryFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return BINARY_EXTENSIONS.has(ext)
}
