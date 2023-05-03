export type PipelineMethod<T> = (row: T, idx: number) => Promise<T> | T

export async function applyPipeline<T>(pipeline: PipelineMethod<T>[], row: T, idx: number) {
  let value = row

  for (const operation of pipeline) {
    value = await operation(value, idx)
  }

  return value
}
