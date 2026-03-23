import { simpleHash } from '../utils/hash'
import { pick } from '../utils/pick'
import { isPromise, SKIP } from './apply-pipeline'
import type { PipelineMethod } from './get-instance'

export function chainables<PipelineOutput>(
  stack: <CallbackOutput>(callback: PipelineMethod<PipelineOutput, CallbackOutput>) => any,
) {
  return {
    map<CallbackOutput>(callback: PipelineMethod<PipelineOutput, CallbackOutput>) {
      return stack(callback)
    },

    pick<Column extends keyof PipelineOutput>(keys: Column | Column[]) {
      return stack(function pick_(value: PipelineOutput) {
        return pick(value as Record<string, unknown>, keys as string | string[]) as Record<
          Column,
          PipelineOutput[Column]
        >
      })
    },

    filter(callback: PipelineMethod<PipelineOutput, boolean>) {
      return stack(function filter_(value: PipelineOutput, index: number) {
        const result = callback(value, index)

        if (isPromise(result)) {
          return result.then((v) => (v ? value : (SKIP as any)))
        }

        return result ? value : (SKIP as any)
      })
    },

    forEach(callback: PipelineMethod<PipelineOutput, void>) {
      return stack(function forEach_(value: PipelineOutput, index: number) {
        const result = callback(value, index)

        if (isPromise(result)) {
          return result.then(() => value)
        }

        return value
      })
    },

    uniq(iterator?: any) {
      const callback = (() => {
        if (typeof iterator === 'string') {
          return function uniqMap_(value: PipelineOutput) {
            return value[iterator as keyof PipelineOutput]
          }
        }
        if (Array.isArray(iterator)) {
          return function uniqMap_(value: PipelineOutput) {
            return pick(value as Record<string, unknown>, iterator as string[])
          }
        }
        return iterator as PipelineMethod<PipelineOutput, string>
      })()

      let seen = new Set<string>()
      let lastIndex = -1

      return stack(function uniq_(value: PipelineOutput, index: number) {
        if (index <= lastIndex) {
          seen = new Set<string>()
        }
        lastIndex = index

        const rowToHash = callback ? callback(value, index) : value

        if (isPromise(rowToHash)) {
          return rowToHash.then((resolved: unknown) => {
            const hashedRow = simpleHash(resolved)
            if (seen.has(hashedRow)) return SKIP as any
            seen.add(hashedRow)
            return value
          })
        }

        const hashedRow = simpleHash(rowToHash)
        if (seen.has(hashedRow)) return SKIP as any
        seen.add(hashedRow)
        return value
      })
    },
  }
}
