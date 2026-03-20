import { ErrorPolicy } from '..'
import { CSVError, RowError } from '../utils/errors'
import { getInterface } from '../utils/get-interface'
import { applyPipeline } from './apply-pipeline'
import { PipelineMethod } from './get-instance'

type TraversorOptions<PipelineOutput, CallbackOutput, DefaultOutput> = {
  callback: PipelineMethod<PipelineOutput, CallbackOutput>
  defaultReturn: DefaultOutput | (() => DefaultOutput | Promise<DefaultOutput>)
}

export function getTraversor<PipelineOutput>(options: {
  getCSVInterface: () => ReturnType<typeof getInterface>
  errors: ErrorPolicy
  pipeline: [...Callbacks: PipelineMethod<unknown, unknown>[], LastCallback: PipelineMethod<unknown, PipelineOutput>]
}) {
  async function traversor(): Promise<void>
  async function traversor<CallbackOutput, DefaultOutput>(
    traversorOptions: TraversorOptions<PipelineOutput, CallbackOutput, DefaultOutput>,
  ): Promise<CallbackOutput | DefaultOutput>

  async function traversor<CallbackOutput, DefaultOutput>(
    traversorOptions?: TraversorOptions<PipelineOutput, CallbackOutput, DefaultOutput>,
  ) {
    let idx = 0
    const csvErrors: RowError[] = []

    const readInterface = options.getCSVInterface()

    for await (const row of readInterface) {
      try {
        const value = (await applyPipeline(options.pipeline, row, idx)) as PipelineOutput

        if (traversorOptions?.callback) {
          const result = await traversorOptions.callback(value, idx)
          return result
        }
      } catch (error) {
        if (error instanceof Error) {
          if (options.errors === 'throw-early') {
            throw new CSVError([{ idx: idx + 1, error, message: error.message }])
          }
          if (options.errors === 'throw-late') {
            csvErrors.push({
              idx: idx + 1,
              error,
              message: error.message,
            })
          }
        }
      }
      idx++
    }

    const output =
      typeof traversorOptions?.defaultReturn === 'function'
        ? await (traversorOptions.defaultReturn as () => DefaultOutput | Promise<DefaultOutput>)()
        : traversorOptions?.defaultReturn

    if (options.errors === 'throw-late' && csvErrors.length > 0) {
      throw new CSVError(csvErrors, output)
    }

    return output
  }

  return traversor
}
