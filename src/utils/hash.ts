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
        return `a:${JSON.stringify(source)}`
      }

      const keys = Object.keys(source).sort()
      let hash = 'o:'

      for (let i = 0; i < keys.length; i++) {
        if (i > 0) hash += '\x00'
        hash += keys[i] + '\x00' + simpleHash(source[keys[i]])
      }

      return hash
    }
  }
}
