export const SKIP: unique symbol = Symbol('skip')

export async function applyPipeline(
  pipeline: ((row: unknown, idx: number) => Promise<unknown> | unknown)[],
  row: unknown,
  idx: number,
): Promise<unknown> {
  let value = row

  for (const operation of pipeline) {
    value = await operation(value, idx)
    if (value === SKIP) return SKIP
  }

  return value
}
