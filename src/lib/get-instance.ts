import {Options as StringifyOptions, Stringifier, stringify} from 'csv-stringify'
import {createWriteStream, WriteStream} from 'fs'
import isArray from 'lodash.isarray'
import isEqual from 'lodash.isequal'
import pick from 'lodash.pick'
import {ErrorPolicy} from '..'
import {DuplicateExit, PipelineContinue, RowExit} from '../utils/flow-control'
import {getInterface} from '../utils/get-interface'
import {simpleHash} from '../utils/hash'
import {WithCSVInstance} from '../utils/types'
import {getTraversor} from './traverse'

export type PipelineMethod<PipelineOutput, CallbackOutput> = (
  row: PipelineOutput,
  idx: number,
) => Promise<CallbackOutput> | CallbackOutput

export function getInstance<PipelineOutput>({
  getCSVInterface,
  errors,
  pipeline,
}: {
  getCSVInterface: () => ReturnType<typeof getInterface>
  errors: ErrorPolicy
  pipeline: [...Callbacks: PipelineMethod<unknown, unknown>[], LastCallback: PipelineMethod<unknown, PipelineOutput>]
}): WithCSVInstance<PipelineOutput> {
  const traversor = getTraversor<PipelineOutput>({getCSVInterface, errors, pipeline})

  function stack<CallbackOutput>(callback: PipelineMethod<PipelineOutput, CallbackOutput>) {
    return getInstance({
      getCSVInterface,
      errors,
      pipeline: [...pipeline, callback as PipelineMethod<unknown, CallbackOutput>],
    })
  }

  return {
    /**
     * Maps the rows to a new shape
     * @param callback (value, index) => {}
     */
    map<CallbackOutput>(callback: PipelineMethod<PipelineOutput, CallbackOutput>) {
      return stack(async function map_(value, index) {
        return await callback(value, index)
      })
    },

    pick<Column extends keyof PipelineOutput>(keys: Column | Column[]) {
      return stack(async function pick_(value) {
        return pick(value, keys) as Record<Column, PipelineOutput[Column]>
      })
    },

    filter(callback: PipelineMethod<PipelineOutput, boolean>) {
      return stack(async function filter_(value, index) {
        if (await callback(value, index)) {
          return value
        }
        throw new RowExit()
      })
    },

    forEach(callback: PipelineMethod<PipelineOutput, void>) {
      return stack(async function forEach_(value, index) {
        await callback(value, index)
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
        if (isArray(iterator)) {
          return function uniqMap_(value: PipelineOutput) {
            return pick(value, iterator)
          }
        }
        return iterator as PipelineMethod<PipelineOutput, string>
      })()

      const seen = new Set<string>()

      return stack(async function forEach_(value, index) {
        if (index === 0) {
          seen.clear()
        }

        const rowToHash = callback ? await callback(value, index) : value
        const hashedRow = simpleHash(rowToHash)
        const isInCache = seen.has(hashedRow)

        if (isInCache) {
          throw new DuplicateExit()
        }

        seen.add(hashedRow)

        return value
      })
    },

    async process() {
      await traversor()
    },

    async find(callback) {
      async function find_(row: PipelineOutput, idx: number) {
        if (!(await callback(row, idx))) {
          throw new PipelineContinue()
        }

        return row
      }

      return traversor({
        callback: find_,
        defaultReturn: null,
      })
    },

    async findIndex(callback) {
      async function findIndex_(row: PipelineOutput, idx: number) {
        if (!(await callback(row, idx))) {
          throw new PipelineContinue()
        }

        return idx
      }

      return traversor({
        callback: findIndex_,
        defaultReturn: -1,
      })
    },

    async every(callback) {
      async function every_(row: PipelineOutput, idx: number) {
        if (await callback(row, idx)) {
          throw new PipelineContinue()
        }

        return false
      }

      return traversor({
        callback: every_,
        defaultReturn: true,
      })
    },

    async some(callback) {
      async function some_(row: PipelineOutput, idx: number) {
        if (!(await callback(row, idx))) {
          throw new PipelineContinue()
        }

        return true
      }

      return traversor({
        callback: some_,
        defaultReturn: false,
      })
    },

    async includes(searchedValue) {
      function includes_(row: PipelineOutput, idx: number) {
        if (!isEqual(row, searchedValue)) {
          throw new PipelineContinue()
        }

        return true
      }

      return traversor({
        callback: includes_,
        defaultReturn: false,
      })
    },

    async rows() {
      const dataset: PipelineOutput[] = []
      function accumulate_(row: PipelineOutput) {
        dataset.push(row)
        throw new PipelineContinue()

        return dataset
      }

      return traversor({
        callback: accumulate_,
        defaultReturn: dataset,
      })
    },

    async first(limit = 1) {
      const subset: PipelineOutput[] = []
      function first_(row: PipelineOutput, idx: number) {
        if (idx < limit) {
          subset.push(row)
          throw new PipelineContinue()
        }

        return subset
      }

      return traversor({
        callback: first_,
        defaultReturn: subset,
      })
    },

    async last(limit = 1) {
      const subset: PipelineOutput[] = []
      function last_(row: PipelineOutput, idx: number) {
        if (subset.length >= limit) {
          subset.shift()
        }

        subset.push(row)
        throw new PipelineContinue()

        return subset
      }

      return traversor({
        callback: last_,
        defaultReturn: subset,
      })
    },

    async skip(offset = 1) {
      const subset: PipelineOutput[] = []
      function skip_(row: PipelineOutput, idx: number) {
        if (idx >= offset) {
          subset.push(row)
        }
        throw new PipelineContinue()
        return subset
      }

      return traversor({
        callback: skip_,
        defaultReturn: subset,
      })
    },

    async count() {
      let count = 0
      function count_() {
        count++
        throw new PipelineContinue()

        return count
      }

      return traversor({
        callback: count_,
        defaultReturn: () => count,
      })
    },

    async key(property, filterUndefined) {
      const subset: PipelineOutput[typeof property][] = []
      function key_(row: PipelineOutput) {
        const keyValue = row[property]

        if (!keyValue && filterUndefined) {
          throw new PipelineContinue()
        }

        subset.push(keyValue)
        throw new PipelineContinue()

        return subset
      }

      return traversor({
        callback: key_,
        defaultReturn: subset,
      })
    },

    // async toJSON(replacer, space) {
    //   // TODO : https://www.npmjs.com/package/streaming-json-stringify
    //   const dataset = await toDataset()
    //   return JSON.stringify(dataset, replacer, space)
    // },

    async toCSV(csvTarget, stringifyOptions) {
      const outputStream = (() => {
        if (csvTarget instanceof WriteStream) {
          return csvTarget
        }

        return createWriteStream(csvTarget, {encoding: 'utf-8'})
      })()

      let stringifier: Stringifier | null = null

      function toCSV_(row: PipelineOutput) {
        {
          if (!stringifier) {
            const options: StringifyOptions = (() => {
              if (stringifyOptions) {
                return stringifyOptions
              }

              return {
                header: true,
                columns: Object.keys(row as any),
              }
            })()

            stringifier = stringify(options)
          }

          stringifier.write(Object.values(row as any))
        }
      }

      return traversor({
        callback: toCSV_,
        defaultReturn: () => {
          if (!!stringifier) {
            stringifier.end()
            stringifier.pipe(outputStream)
          }
        },
      })
    },
  }
}
