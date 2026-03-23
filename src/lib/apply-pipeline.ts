export const SKIP: unique symbol = Symbol('skip')

export function isPromise(value: unknown): value is Promise<unknown> {
  return value !== null && typeof value === 'object' && typeof (value as any).then === 'function'
}

export function applyPipeline(
  pipeline: ((row: unknown, idx: number) => Promise<unknown> | unknown)[],
  row: unknown,
  idx: number,
): Promise<unknown> | unknown {
  let value: unknown = row

  for (let i = 0; i < pipeline.length; i++) {
    value = pipeline[i](value, idx)

    if (isPromise(value)) {
      return applyPipelineAsync(pipeline, value, idx, i + 1)
    }

    if (value === SKIP) return SKIP
  }

  return value
}

async function applyPipelineAsync(
  pipeline: ((row: unknown, idx: number) => Promise<unknown> | unknown)[],
  pending: Promise<unknown>,
  idx: number,
  startIndex: number,
): Promise<unknown> {
  let value = await pending

  if (value === SKIP) return SKIP

  for (let i = startIndex; i < pipeline.length; i++) {
    value = await pipeline[i](value, idx)
    if (value === SKIP) return SKIP
  }

  return value
}
