import {PipelineExit} from './errors'

export type PipelineMethod<T> = (row: T, idx: number) => Promise<T>

export async function applyPipeline<T>(pipeline: PipelineMethod<T>[], row: T, idx: number) {
  let value = row

  for (const operation of pipeline) {
    try {
      value = await operation(value, idx)
    } catch (e) {
      throw new PipelineExit()
    }
  }
  return value
}
