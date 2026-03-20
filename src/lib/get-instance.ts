import { Stringifier as CSVStringifier, stringify as csvStringify, Options as CSVStringifyOptions } from 'csv-stringify'
import { createWriteStream, WriteStream } from 'fs'
import { ErrorPolicy } from '..'
import { isDeepStrictEqual } from 'node:util'
import { CSVError } from '../utils/errors'
import { getInterface } from '../utils/get-interface'
import { simpleHash } from '../utils/hash'
import { pick } from '../utils/pick'
import { WithCSVInstance } from '../utils/types'
import { SKIP } from './apply-pipeline'
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
    map<CallbackOutput>(callback: PipelineMethod<PipelineOutput, CallbackOutput>) {
      return stack(callback)
    },

    pick<Column extends keyof PipelineOutput>(keys: Column | Column[]) {
      return stack(function pick_(value) {
        return pick(value as Record<string, unknown>, keys as string | string[]) as Record<
          Column,
          PipelineOutput[Column]
        >
      })
    },

    filter(callback: PipelineMethod<PipelineOutput, boolean>) {
      return stack(function filter_(value, index) {
        const result = callback(value, index)

        if (typeof result === 'object' && result !== null && typeof (result as any).then === 'function') {
          return (result as Promise<boolean>).then((v) => (v ? value : (SKIP as any)))
        }

        return result ? value : (SKIP as any)
      })
    },

    forEach(callback: PipelineMethod<PipelineOutput, void>) {
      return stack(function forEach_(value, index) {
        const result = callback(value, index)

        if (typeof result === 'object' && result !== null && typeof (result as any).then === 'function') {
          return (result as Promise<void>).then(() => value)
        }

        return value
      })
    },

    uniq(iterator) {
      const callback = (() => {
        if (typeof iterator === 'string') {
          return function uniqMap_(value: PipelineOutput) {
            return value[iterator]
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
      let initialized = false

      return stack(function uniq_(value, index) {
        if (!initialized) {
          seen = new Set<string>()
          initialized = true
        }

        const rowToHash = callback ? callback(value, index) : value

        if (typeof rowToHash === 'object' && rowToHash !== null && typeof (rowToHash as any).then === 'function') {
          return (rowToHash as Promise<unknown>).then((resolved) => {
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

    async process() {
      for await (const _ of getRows()) {
        // side effects happen in the pipeline (forEach)
      }
    },

    async find(callback) {
      for await (const { value, idx } of getRows()) {
        if (await callback(value, idx)) {
          return value
        }
      }

      return null
    },

    async findIndex(callback) {
      for await (const { value, idx } of getRows()) {
        if (await callback(value, idx)) {
          return idx
        }
      }

      return -1
    },

    async every(callback) {
      for await (const { value, idx } of getRows()) {
        if (!(await callback(value, idx))) {
          return false
        }
      }

      return true
    },

    async some(callback) {
      for await (const { value, idx } of getRows()) {
        if (await callback(value, idx)) {
          return true
        }
      }

      return false
    },

    async includes(searchedValue) {
      for await (const { value } of getRows()) {
        if (isDeepStrictEqual(value, searchedValue)) {
          return true
        }
      }

      return false
    },

    async rows() {
      const dataset: PipelineOutput[] = []

      try {
        for await (const { value } of getRows()) {
          dataset.push(value)
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = dataset
          throw error
        }
        throw error
      }

      return dataset
    },

    async first(limit = 1) {
      const subset: PipelineOutput[] = []

      for await (const { value } of getRows()) {
        subset.push(value)

        if (subset.length >= limit) {
          break
        }
      }

      return subset
    },

    async last(limit = 1) {
      const subset: PipelineOutput[] = []

      try {
        for await (const { value } of getRows()) {
          if (subset.length >= limit) {
            subset.shift()
          }

          subset.push(value)
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = subset
          throw error
        }
        throw error
      }

      return subset
    },

    async skip(offset = 1) {
      const subset: PipelineOutput[] = []

      try {
        for await (const { value, idx } of getRows()) {
          if (idx >= offset) {
            subset.push(value)
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = subset
          throw error
        }
        throw error
      }

      return subset
    },

    async count() {
      let count = 0

      try {
        for await (const _ of getRows()) {
          count++
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = count
          throw error
        }
        throw error
      }

      return count
    },

    async key(property, filterUndefined) {
      const subset: PipelineOutput[typeof property][] = []

      try {
        for await (const { value } of getRows()) {
          const keyValue = value[property]

          if (keyValue === undefined && filterUndefined) {
            continue
          }

          subset.push(keyValue)
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = subset
          throw error
        }
        throw error
      }

      return subset
    },

    async toJSONFile(jsonTarget, stringifier = (row) => JSON.stringify(row, null, 2)) {
      const outputStream =
        jsonTarget instanceof WriteStream ? jsonTarget : createWriteStream(jsonTarget, { encoding: 'utf-8' })

      function drain() {
        return new Promise<void>((resolve) => outputStream.once('drain', resolve))
      }

      function finish() {
        return new Promise<void>((resolve, reject) => {
          outputStream.on('finish', resolve)
          outputStream.on('error', reject)
          outputStream.end()
        })
      }

      outputStream.write('[')
      let first = true

      try {
        for await (const { value } of getRows()) {
          let chunk = ''

          if (first) {
            first = false
          } else {
            chunk = ','
          }

          chunk += stringifier(value)

          if (!outputStream.write(chunk)) {
            await drain()
          }
        }
      } finally {
        outputStream.write(']')
        await finish()
      }
    },

    async toCSVFile(csvTarget, stringifyOptions) {
      const outputStream =
        csvTarget instanceof WriteStream ? csvTarget : createWriteStream(csvTarget, { encoding: 'utf-8' })

      let stringifier: CSVStringifier | undefined
      let columnOrder: string[] | undefined

      try {
        for await (const { value } of getRows()) {
          if (!stringifier) {
            columnOrder = Object.keys(value as any)
            const options: CSVStringifyOptions = stringifyOptions ?? {
              header: true,
              columns: columnOrder,
            }

            stringifier = csvStringify(options)
            stringifier.pipe(outputStream)
          }

          const orderedValues = columnOrder!.map((key) => (value as any)[key])
          stringifier.write(orderedValues)
        }
      } finally {
        if (stringifier) {
          await new Promise<void>((resolve, reject) => {
            outputStream.on('finish', resolve)
            outputStream.on('error', reject)
            stringifier!.end()
          })
        }
      }
    },
  }
}
