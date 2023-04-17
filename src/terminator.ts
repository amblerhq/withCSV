import {isFunction} from 'lodash'
import {applyPipeline, PipelineMethod} from './apply-pipeline'
import {PipelineExit} from './errors'
import {getInterface} from './get-interface'
import {Predicate} from './utility-types'

// async function terminator<T, U, V>(params: {
//   pipeline: PipelineMethod<T>[]
//   readInterface: ReturnType<typeof getInterface>
//   rowCallback?: Predicate<T, U>
//   returnCallback: (result: U, idx: number) => V | undefined
// }): Promise<U>

// async function terminator<T>(params: {
//   pipeline: PipelineMethod<T>[]
//   readInterface: ReturnType<typeof getInterface>
//   rowCallback?: never
//   returnCallback: (result: T, idx: number) => unknown | undefined
// }): Promise<T>

// export function traverse<PipelineOutput>(
//   params: {
//     pipeline: PipelineMethod<PipelineOutput>[]
//     readInterface: ReturnType<typeof getInterface>
//   },
//   chain?: never,
// ): Promise<PipelineOutput>
// export function traverse<PipelineOutput, OnRowOutput, TerminatorOutput>(
//   params: {
//     pipeline: PipelineMethod<PipelineOutput>[]
//     readInterface: ReturnType<typeof getInterface>
//   },
//   chain?: {
//     onRow: Predicate<PipelineOutput, OnRowOutput>
//     exitWhen: Predicate<OnRowOutput, boolean>
//     returning: Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, TerminatorOutput>
//   },
// ): Promise<TerminatorOutput>

// type TraverseOutput<PipelineOutput, OnRowOutput, TerminatorOutput> = {
//   onRow: <CallbackOutput>(
//     callback: Predicate<PipelineOutput, CallbackOutput>,
//   ) => TraverseOutput<PipelineOutput, CallbackOutput, TerminatorOutput>
//   exitWhen: (callback: Predicate<OnRowOutput, boolean>) => TraverseOutput<PipelineOutput, OnRowOutput, TerminatorOutput>
//   returning: <CallbackOutput>(
//     callback: Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, CallbackOutput>,
//   ) => TraverseOutput<PipelineOutput, OnRowOutput, CallbackOutput>
// }

// export function traverses<PipelineOutput, OnRowOutput = PipelineOutput, TerminatorOutput = OnRowOutput>(
//   params: {
//     pipeline: PipelineMethod<PipelineOutput>[]
//     readInterface: ReturnType<typeof getInterface>
//   },
//   chain?: {
//     onRow: Predicate<PipelineOutput, OnRowOutput>
//     exitWhen: Predicate<OnRowOutput, boolean>
//     returning: Predicate<{originalValue: PipelineOutput; transformedValue: OnRowOutput}, TerminatorOutput>
//   },
// ): TraverseOutput<PipelineOutput, OnRowOutput, TerminatorOutput> {
//   if (!chain) {
//     return traverse<PipelineOutput, OnRowOutput, TerminatorOutput>(params, {
//       onRow: value => value as unknown as OnRowOutput,
//       exitWhen: () => false,
//       returning: ({transformedValue}) => transformedValue as unknown as TerminatorOutput,
//     })
//   }

//   return {
//     onRow<CallbackOutput>(callback: Predicate<PipelineOutput, CallbackOutput>) {
//       const newChain = traverse(params, {
//         ...chain,
//         onRow: callback,
//       }) as TraverseOutput<PipelineOutput, OnRowOutput, TerminatorOutput>
//     },
//     exitWhen<OnRowOutput>(callback: Predicate<PipelineOutput, OnRowOutput>) {
//       return traverse<PipelineOutput, OnRowOutput>(params, {...chain, onRow: callback})
//     },
//     returning<OnRowOutput>(callback: Predicate<PipelineOutput, OnRowOutput>) {
//       return traverse<PipelineOutput, OnRowOutput>(params, {...chain, onRow: callback})
//     },
//   }
// }

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

          if (await chain.exitWhen(value, idx)) {
            if (isFunction(chain.returning)) {
              return chain.returning({originalValue: value, transformedValue: rowResult}, idx)
            }

            return chain.returning
          }
        } catch (e) {
          if (!(e instanceof PipelineExit)) {
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
// async function terminator<T, U>({readInterface, rowCallback, returnCallback}) {
//   let idx = 0

//   const noop = (value: T) => value

//   for await (const row of readInterface) {
//     try {
//       const value = await applyPipeline(pipeline, row, idx)

//       const rowResult = rowCallback ? await rowCallback(value) : noop(value)

//       const returnResult = await returnCallback(rowResult, idx)

//       if (!!returnResult) {
//         return returnResult
//       }
//     } catch (e) {
//       if (!(e instanceof PipelineExit)) {
//         throw e
//       }
//     }
//     idx++
//   }
//   return null
// }
