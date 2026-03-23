import { ErrorPolicy } from '../utils/types'
import { getInterface } from '../utils/get-interface'
import { WithCSVInstance } from '../utils/types'
import { chainables } from './chainables'
import { fileOutput } from './file-output'
import { terminators } from './terminators'
import { traverseRows } from './traverse'

export type PipelineMethod<PipelineOutput, CallbackOutput> = (
  row: PipelineOutput,
  idx: number,
) => Promise<CallbackOutput> | CallbackOutput

type GetInstanceParams<PipelineOutput> = {
  getCSVInterface: () => ReturnType<typeof getInterface>
  errors: ErrorPolicy
  pipeline: [...Callbacks: PipelineMethod<unknown, unknown>[], LastCallback: PipelineMethod<unknown, PipelineOutput>]
}

export function getInstance<PipelineOutput>({
  getCSVInterface,
  errors,
  pipeline,
}: GetInstanceParams<PipelineOutput>): WithCSVInstance<PipelineOutput> {
  function getRows() {
    return traverseRows<PipelineOutput>({ getCSVInterface, errors, pipeline })
  }

  function stack<CallbackOutput>(callback: PipelineMethod<PipelineOutput, CallbackOutput>) {
    return getInstance({
      getCSVInterface,
      errors,
      pipeline: [...pipeline, callback as PipelineMethod<unknown, CallbackOutput>],
    })
  }

  return {
    ...chainables<PipelineOutput>(stack),
    ...terminators<PipelineOutput>(getRows),
    ...fileOutput<PipelineOutput>(getRows),
  } as WithCSVInstance<PipelineOutput>
}
