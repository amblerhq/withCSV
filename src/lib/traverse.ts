import isFunction from 'lodash.isfunction'
import {FlowControlSignal} from '../utils/errors'
import {getInterface} from '../utils/get-interface'
import {Predicate} from '../utils/types'
import {applyPipeline, PipelineMethod} from './apply-pipeline'

type TraverseChain<PipelineOutput, OnRowOutput, TerminatorOutput> = {
  onRow: Predicate<PipelineOutput, OnRowOutput>
  exitWhen: Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, boolean>
  returning:
    | TerminatorOutput
    | Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, TerminatorOutput>
  or: TerminatorOutput | (() => TerminatorOutput)
}

type TraverseBuilder<PipelineOutput, OnRowOutput = PipelineOutput, TerminatorOutput = OnRowOutput> = {
  onRow: <CallbackOutput>(
    callback: Predicate<PipelineOutput, CallbackOutput>,
  ) => TraverseBuilder<PipelineOutput, CallbackOutput, TerminatorOutput>
  exitWhen: (
    callback: Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, boolean>,
  ) => TraverseBuilder<PipelineOutput, OnRowOutput, TerminatorOutput>
  returning: <CallbackOutput>(
    callback:
      | CallbackOutput
      | Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, CallbackOutput>,
  ) => TraverseBuilder<PipelineOutput, OnRowOutput, CallbackOutput>
  or: <CallbackOutput>(
    callback: CallbackOutput | (() => CallbackOutput),
  ) => TraverseBuilder<PipelineOutput, OnRowOutput, TerminatorOutput | CallbackOutput>
  value: (params: {
    pipeline: PipelineMethod<PipelineOutput>[]
    readInterface: ReturnType<typeof getInterface>
  }) => Promise<TerminatorOutput>
}

function buildTraverseChain<PipelineOutput, OnRowOutput, TerminatorOutput>(
  chain: TraverseChain<PipelineOutput, OnRowOutput, TerminatorOutput>,
): TraverseBuilder<PipelineOutput, OnRowOutput, TerminatorOutput> {
  return {
    onRow<CallbackOutput>(callback: Predicate<PipelineOutput, CallbackOutput>) {
      return buildTraverseChain({
        ...(chain as unknown as TraverseChain<PipelineOutput, CallbackOutput, TerminatorOutput>),
        onRow: callback,
      })
    },
    exitWhen(callback: Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, boolean>) {
      return buildTraverseChain({
        ...chain,
        exitWhen: callback,
      })
    },
    returning<CallbackOutput>(
      callback:
        | CallbackOutput
        | Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, CallbackOutput>,
    ) {
      return buildTraverseChain({
        ...(chain as unknown as TraverseChain<PipelineOutput, OnRowOutput, CallbackOutput>),
        returning: callback,
      })
    },
    or<CallbackOutput>(callback: CallbackOutput | (() => CallbackOutput)) {
      return buildTraverseChain({
        ...(chain as unknown as TraverseChain<PipelineOutput, OnRowOutput, TerminatorOutput | CallbackOutput>),
        or: callback,
      })
    },
    async value(params) {
      let idx = 0

      for await (const row of params.readInterface) {
        try {
          const value = await applyPipeline(params.pipeline, row, idx)

          const rowResult = await chain.onRow(value, idx)

          if (await chain.exitWhen({originalValue: value, transformedValue: rowResult}, idx)) {
            if (isFunction(chain.returning)) {
              return chain.returning({originalValue: value, transformedValue: rowResult}, idx)
            }

            return chain.returning
          }
        } catch (e) {
          if (!(e instanceof FlowControlSignal)) {
            throw e
          }
        }
        idx++
      }

      if (isFunction(chain.or)) {
        return chain.or()
      }

      return chain.or
    },
  }
}

export function traverse<PipelineOutput>(): TraverseBuilder<PipelineOutput, PipelineOutput, PipelineOutput | null> {
  const defaultChain: TraverseChain<PipelineOutput, PipelineOutput, PipelineOutput | null> = {
    onRow: value => value,
    exitWhen: () => false,
    returning: ({transformedValue}) => transformedValue,
    or: null,
  }

  return buildTraverseChain(defaultChain)
}
