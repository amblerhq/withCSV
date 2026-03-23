export function pick<T extends Record<string, unknown>>(obj: T, keys: keyof T | (keyof T)[]): Partial<T> {
  const arr = Array.isArray(keys) ? keys : [keys]
  const result = {} as Partial<T>
  for (let i = 0; i < arr.length; i++) result[arr[i]] = obj[arr[i]]
  return result
}
