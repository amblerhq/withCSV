import { ErrorPolicy } from '../utils/types'
import { CSVError, RowError } from '../utils/errors'
import { getInterface } from '../utils/get-interface'
import { applyPipeline, isPromise, SKIP } from './apply-pipeline'

export async function* traverseRows<PipelineOutput>(options: {
  getCSVInterface: () => ReturnType<typeof getInterface>
  errors: ErrorPolicy
  pipeline: ((row: unknown, idx: number) => Promise<unknown> | unknown)[]
}): AsyncGenerator<{ value: PipelineOutput; idx: number }> {
  let idx = 0
  const csvErrors: RowError[] = []

  const readInterface = options.getCSVInterface()

  try {
    for await (const row of readInterface) {
      try {
        const rawResult = applyPipeline(options.pipeline, row, idx)
        const result = isPromise(rawResult) ? await rawResult : rawResult

        if (result !== SKIP) {
          yield { value: result as PipelineOutput, idx }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))

        if (options.errors === 'throw-early') {
          throw new CSVError([{ idx: idx + 1, error: err, message: err.message }])
        }

        if (options.errors === 'throw-late') {
          csvErrors.push({ idx: idx + 1, error: err, message: err.message })
        }
      }

      idx++
    }

    if (options.errors === 'throw-late' && csvErrors.length > 0) {
      throw new CSVError(csvErrors)
    }
  } finally {
    readInterface.destroy()
  }
}
