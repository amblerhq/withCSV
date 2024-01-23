export function simpleHash(source: any) {
  switch (typeof source) {
    case 'boolean':
    case 'number':
      return `${source}`
    case 'string':
      return source
    default:
      const json = JSON.stringify(source)

      if (!json?.length) {
        return 'NIL'
      }

      // this code is from https://stackoverflow.com/a/7616484/2715716
      const hash = json.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0)
        return (a |= 0)
      }, 0)

      return hash.toString()
  }
}
