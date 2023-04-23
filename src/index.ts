import {createHash} from 'crypto'
import csv from 'csv-parser'
import {Options as StringifyOptions, Stringifier, stringify} from 'csv-stringify'
import {createWriteStream, ReadStream, WriteStream} from 'fs'
import isArray from 'lodash.isarray'
import isEqual from 'lodash.isequal'
import isString from 'lodash.isstring'
import pick from 'lodash.pick'
import {PipelineMethod} from './lib/apply-pipeline'
import {traverse} from './lib/traverse'
import {DuplicateExit, PipelineExit} from './utils/errors'
import {getInterface} from './utils/get-interface'
import {CsvRowsCollection, Predicate} from './utils/types'

export function withCSV(csvFileOrBuffer: string | Buffer | ReadStream, options?: csv.Options | readonly string[]) {
  const readInterface = getInterface(csvFileOrBuffer, options)
  const instancePipeline: PipelineMethod<unknown>[] = []

  const hashCache = new Set()

  function hashRecord(record: unknown) {
    const hash = createHash('sha1')
    hash.update(JSON.stringify(record), 'utf8')
    return hash.digest('hex')
  }

  function getQueryChain<PipelineOutput>() {
    const pipeline = instancePipeline as PipelineMethod<PipelineOutput>[]

    async function toDataset(limit = Infinity) {
      const dataSet: PipelineOutput[] = []
      const maxIdx = limit - 1

      return traverse<PipelineOutput>()
        .onRow(value => {
          dataSet.push(value)
        })
        .exitWhen((_, idx) => idx >= maxIdx)
        .returning(() => dataSet)
        .or(() => dataSet)
        .value({pipeline, readInterface})
    }

    const queryChain: CsvRowsCollection<PipelineOutput> = {
      /**
       * Chainable methods
       */
      map(callback) {
        instancePipeline.push(async function map_(value, index) {
          return await callback(value as PipelineOutput, index)
        })
        return getQueryChain()
      },

      pick(keys) {
        instancePipeline.push(async function pick_(value) {
          return pick(value, keys)
        })
        return getQueryChain()
      },

      filter(callback) {
        pipeline.push(async function filter_(value, index) {
          if (await callback(value, index)) {
            return value
          }
          throw new PipelineExit()
        })
        return getQueryChain()
      },

      forEach(callback) {
        pipeline.push(async function forEach_(value, index) {
          await callback(value, index)
          return value
        })
        return getQueryChain()
      },

      uniq(iterator) {
        const callback = (() => {
          if (isString(iterator) || isArray(iterator)) {
            return function uniqMap_(value: PipelineOutput) {
              return pick(value, iterator)
            }
          }
          return iterator as Predicate<PipelineOutput, string>
        })()

        pipeline.push(async function uniq_(value, index) {
          const rowToHash = callback ? await callback(value, index) : value
          const hashedRow = hashRecord(rowToHash)

          if (hashCache.has(hashedRow)) {
            throw new DuplicateExit()
          }

          hashCache.add(hashedRow)
          return value
        })

        hashCache.clear()
        return getQueryChain()
      },

      /**
       * Terminator methods
       */
      async process() {
        await traverse<PipelineOutput>().value({pipeline, readInterface})
      },

      async find(callback) {
        return traverse<PipelineOutput>()
          .onRow(callback)
          .exitWhen(({transformedValue}) => !!transformedValue)
          .returning(({originalValue}) => originalValue)
          .or(null)
          .value({pipeline, readInterface})
      },

      async findIndex(callback) {
        return traverse<PipelineOutput>()
          .onRow(callback)
          .exitWhen(({transformedValue}) => !!transformedValue)
          .returning((_, idx) => idx)
          .or(-1)
          .value({pipeline, readInterface})
      },

      async every(callback) {
        return traverse<PipelineOutput>()
          .onRow(callback)
          .exitWhen(({transformedValue}) => !transformedValue)
          .returning(false)
          .or(true)
          .value({pipeline, readInterface})
      },

      async some(callback) {
        return traverse<PipelineOutput>()
          .onRow(callback)
          .exitWhen(({transformedValue}) => !!transformedValue)
          .returning(true)
          .or(false)
          .value({pipeline, readInterface})
      },

      async includes(searchedValue) {
        return traverse<PipelineOutput>()
          .exitWhen(({originalValue}) => isEqual(originalValue, searchedValue))
          .returning(true)
          .or(false)
          .value({pipeline, readInterface})
      },

      async rows() {
        return toDataset()
      },

      async first(limit = 1) {
        return toDataset(limit)
      },

      async last(limit = 1) {
        const subset: PipelineOutput[] = []

        return traverse<PipelineOutput>()
          .onRow(value => {
            if (subset.length >= limit) {
              subset.shift()
            }
            subset.push(value)
          })
          .returning(() => subset)
          .or(() => subset)
          .value({pipeline, readInterface})
      },

      async skip(offset = 1) {
        const subset: PipelineOutput[] = []

        return traverse<PipelineOutput>()
          .onRow((value, idx) => {
            if (idx >= offset) {
              subset.push(value)
            }
          })
          .returning(() => subset)
          .or(() => subset)
          .value({pipeline, readInterface})
      },

      async count() {
        let count = 0

        return traverse<PipelineOutput>()
          .onRow(() => {
            count++
          })
          .returning(() => count)
          .or(() => count)
          .value({pipeline, readInterface})
      },

      async key(property, filterUndefined) {
        const subset: PipelineOutput[typeof property][] = []

        return traverse<PipelineOutput>()
          .onRow((value, idx) => {
            const keyValue = value[property]

            if (!keyValue && filterUndefined) {
              return
            }

            subset.push(keyValue)
          })
          .returning(() => subset)
          .or(() => subset)
          .value({pipeline, readInterface})
      },

      async toJSON(replacer, space) {
        const dataset = await toDataset()
        return JSON.stringify(dataset, replacer, space)
      },

      async toCSV(csvTarget, stringifyOptions) {
        const outputStream = (() => {
          if (csvTarget instanceof WriteStream) {
            return csvTarget
          }

          return createWriteStream(csvTarget, {encoding: 'utf-8'})
        })()

        let stringifier: Stringifier | null = null

        await traverse<PipelineOutput>()
          .onRow(value => {
            if (!stringifier) {
              const options: StringifyOptions = (() => {
                if (stringifyOptions) {
                  return stringifyOptions
                }

                return {
                  header: true,
                  columns: Object.keys(value as any),
                }
              })()

              stringifier = stringify(options)
            }

            stringifier.write(Object.values(value as any))
          })
          .returning(null)
          .or(() => {
            if (!!stringifier) {
              stringifier.end()
              stringifier.pipe(outputStream)
            }
          })
          .value({pipeline, readInterface})
      },
    }
    return queryChain
  }

  return {
    columns<T extends string>(columns: T[] | readonly T[]) {
      const queryChain = getQueryChain<Record<T, string>>()
      if (columns && columns.length > 0) {
        queryChain.map(value => pick(value, columns))
      }
      return queryChain
    },
  }
}
