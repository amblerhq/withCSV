export function simpleHash(source: any): string {
  if (source === null || source === undefined) {
    return 'NIL'
  }

  switch (typeof source) {
    case 'boolean':
      return `b:${source}`
    case 'number':
      return `n:${source}`
    case 'string':
      return `s:${source}`
    default: {
      if (Array.isArray(source)) {
        return `a:${source.map(simpleHash).join('\x00')}`
      }

      const keys = Object.keys(source).sort()
      return `o:${keys.map(k => k + '\x00' + simpleHash(source[k])).join('\x00')}`
    }
  }
}
