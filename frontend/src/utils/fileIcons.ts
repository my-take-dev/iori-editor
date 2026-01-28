/**
 * Returns a Tailwind color class based on file extension.
 */
export function getFileIconColor(ext: string): string {
  switch (ext) {
    case 'go':
      return 'text-cyan-400'
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
      return 'text-yellow-400'
    case 'md':
      return 'text-purple-400'
    case 'json':
      return 'text-green-400'
    case 'css':
    case 'scss':
      return 'text-blue-400'
    case 'html':
      return 'text-orange-400'
    default:
      return 'text-gray-400'
  }
}
