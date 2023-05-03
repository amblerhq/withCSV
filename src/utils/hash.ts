export function simpleHash(source: any) {
  const json = JSON.stringify(source)
  let hash = 0

  if (!json?.length) {
    return 'NIL'
  }

  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash // Convert to 32bit integer
  }

  return new Uint32Array([hash])[0].toString(36)
}
