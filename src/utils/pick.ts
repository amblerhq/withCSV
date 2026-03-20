export function pick<T extends Record<string, unknown>>(obj: T, keys: keyof T | (keyof T)[]): Partial<T> {
  const arr = Array.isArray(keys) ? keys : [keys]
  return Object.fromEntries(arr.map(k => [k, obj[k]])) as Partial<T>
}
