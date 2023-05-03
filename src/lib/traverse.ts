import isFunction from 'lodash.isfunction'
import {ErrorPolicy} from '..'
import {CSVError, RowError} from '../utils/errors'
import {getInterface} from '../utils/get-interface'
import {applyPipeline} from './apply-pipeline'
import {PipelineMethod} from './get-instance'

export function getTraversor<PipelineOutput>(options: {
  getCSVInterface: () => ReturnType<typeof getInterface>
  errors: ErrorPolicy
  pipeline: [...Callbacks: PipelineMethod<unknown, unknown>[], LastCallback: PipelineMethod<unknown, PipelineOutput>]
}) {
  async function traversor<CallbackOutput, DefaultOutput>(traversorOptions: {
    callback: PipelineMethod<PipelineOutput, CallbackOutput>
    defaultReturn: DefaultOutput | (() => DefaultOutput | Promise<DefaultOutput>)
  }): Promise<CallbackOutput | DefaultOutput>
  async function traversor<CallbackOutput, DefaultOutput>(): Promise<undefined>

  async function traversor<CallbackOutput, DefaultOutput>(traversorOptions?: {
    callback: PipelineMethod<PipelineOutput, CallbackOutput>
    defaultReturn: DefaultOutput | (() => DefaultOutput | Promise<DefaultOutput>)
  }): Promise<CallbackOutput | DefaultOutput | undefined> {
    let idx = 0
    const csvErrors: RowError[] = []

    const readInterface = options.getCSVInterface()

    for await (const row of readInterface) {
      try {
        const value = await applyPipeline(options.pipeline, row, idx)

        if (!!traversorOptions?.callback) {
          const result = await traversorOptions.callback(value, idx)
          return result
        }
      } catch (e) {
        if (e instanceof Error) {
          if (options.errors === 'throw-early') {
            throw e
          }
          if (options.errors === 'throw-late') {
            csvErrors.push({
              idx: idx + 1,
              error: (e as Error).message,
            })
          }
        }
      }
      idx++
    }

    if (traversorOptions === undefined) {
      return undefined
    }

    let output: DefaultOutput

    if (isFunction(traversorOptions.defaultReturn)) {
      output = await traversorOptions.defaultReturn()
    } else {
      output = traversorOptions.defaultReturn
    }

    if (options.errors === 'throw-late' && csvErrors.length > 0) {
      throw new CSVError(csvErrors, output)
    }

    return output
  }

  return traversor
}
