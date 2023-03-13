import {createHash} from 'crypto'
import {createReadStream, createWriteStream, ReadStream, WriteStream} from 'fs'
import pick from 'lodash.pick'
import isEqual from 'lodash.isequal'
import isString from 'lodash.isstring'
import isArray from 'lodash.isarray'
import csv from 'csv-parser'
import {stringify, Options as StringifyOptions, Stringifier} from 'csv-stringify'
import {Readable} from 'stream'

type ArrayMethod<T, U> = (value: T, index?: number) => U | Promise<U>

type PipelineMethod<T> = (row: T, idx: number) => Promise<T>

const hashCache = new Set()

type CsvRowsCollection<T> = {
  /**
   * Chainable methods
   */
  uniq<U extends keyof T>(iterator?: ArrayMethod<T, string> | U | U[]): CsvRowsCollection<T>
  filter(cb: ArrayMethod<T, boolean>): CsvRowsCollection<T>
  map<U>(cb: ArrayMethod<T, U>): CsvRowsCollection<U>
  pick: <U extends keyof T>(keys: U | U[]) => CsvRowsCollection<Record<U, string>>
  forEach(cb: ArrayMethod<T, void>): CsvRowsCollection<T>

  /**
   * Terminator methods
   */
  process: () => Promise<void>
  find: (cb: ArrayMethod<T, boolean>) => Promise<T | null>
  findIndex: (cb: ArrayMethod<T, boolean>) => Promise<number>
  every: (cb: ArrayMethod<T, boolean>) => Promise<boolean>
  some: (cb: ArrayMethod<T, boolean>) => Promise<boolean>
  includes: (value: T) => Promise<boolean>
  rows: () => Promise<T[]>
  toJSON: (replacer?: (number | string)[] | null, space?: string | number) => Promise<string>
  toCSV: (csvTarget: string | WriteStream, options?: StringifyOptions) => Promise<void>
  key: <U extends keyof T>(property: U, filterUndefined?: true) => Promise<T[U][]>
  first: (n: number) => Promise<T[]>
  last: (n: number) => Promise<T[]>
  skip: (n: number) => Promise<T[]>
  count: () => Promise<number>
}

function getInterface(csvSource: string | Buffer | ReadStream, options?: Parameters<typeof csv>[0]) {
  const stream = (() => {
    if (csvSource instanceof ReadStream) {
      return csvSource
    }

    if (typeof csvSource === 'string') {
      return createReadStream(csvSource, {encoding: 'utf-8'})
    }

    return Readable.from(csvSource)
  })()

  if (!stream) {
    throw new Error('Input should be a string path, a Buffer or a ReadStream')
  }

  return stream.pipe(csv(options))
}

function hashRecord(record: any) {
  const hash = createHash('sha1')
  hash.update(JSON.stringify(record), 'utf8')
  return hash.digest('hex')
}

export function withCSV(csvFileOrBuffer: string | Buffer | ReadStream, options?: csv.Options | readonly string[]) {
  const readInterface = getInterface(csvFileOrBuffer, options)
  const pipeline: PipelineMethod<any>[] = []

  function getQueryChain<T>() {
    async function applyPipeline(row: T, idx: number) {
      let value = row
      // First apply the pipeline to each row to filter/map it
      for (const operation of pipeline) {
        try {
          value = await operation(value, idx)
        } catch (e) {
          throw "Didn't make it to the end of the pipeline"
        }
      }
      return value
    }

    async function toDataset(limit?: number) {
      const dataSet: T[] = []
      let idx = 0
      const maxIdx = limit ? limit - 1 : Infinity
      for await (const row of readInterface) {
        try {
          const value = await applyPipeline(row, idx)
          dataSet.push(value)
        } catch (e) {}
        if (idx >= maxIdx) {
          break
        }
        idx++
      }
      return dataSet
    }

    const queryChain: CsvRowsCollection<T> = {
      /**
       * Chainable methods
       */
      map(callback) {
        pipeline.push(async function map_(value, index) {
          return await callback(value, index)
        })
        return getQueryChain()
      },

      pick(keys) {
        pipeline.push(async function map_(value) {
          return await pick(value, keys)
        })
        return getQueryChain()
      },

      filter(callback) {
        pipeline.push(async function filter_(value, index) {
          if (await callback(value, index)) {
            return value
          }
          throw 'Filtered out'
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
            return function uniqMap_(value: T) {
              return pick(value, iterator)
            }
          }
          return iterator as ArrayMethod<T, string>
        })()

        pipeline.push(async function uniq_(value, index) {
          const rowToHash = callback ? await callback(value, index) : value
          const hashedRow = hashRecord(rowToHash)

          if (hashCache.has(hashedRow)) {
            throw 'Duplicate'
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
        let idx = 0
        for await (const row of readInterface) {
          await applyPipeline(row, idx)
          idx++
        }
      },

      async find(callback) {
        let idx = 0
        for await (const row of readInterface) {
          try {
            const value = await applyPipeline(row, idx)
            const result = await callback(value)

            if (result) {
              return value
            }
          } catch (e) {}
          idx++
        }
        return null
      },

      async findIndex(callback) {
        let idx = 0
        for await (const row of readInterface) {
          try {
            const value = await applyPipeline(row, idx)
            const result = await callback(value)

            if (result) {
              return idx
            }
          } catch (e) {}
          idx++
        }
        return -1
      },

      async every(callback) {
        let idx = 0
        for await (const row of readInterface) {
          try {
            const value = await applyPipeline(row, idx)
            const result = await callback(value)

            if (!result) {
              return false
            }
          } catch (e) {}
          idx++
        }
        return true
      },

      async some(callback) {
        let idx = 0
        for await (const row of readInterface) {
          try {
            const value = await applyPipeline(row, idx)
            const result = await callback(value)

            if (result) {
              return true
            }
          } catch (e) {}
          idx++
        }
        return false
      },

      async includes(searchedValue) {
        let idx = 0
        for await (const row of readInterface) {
          try {
            const value = await applyPipeline(row, idx)

            if (isEqual(value, searchedValue)) {
              return true
            }
          } catch (e) {}
          idx++
        }
        return false
      },

      async rows() {
        return toDataset()
      },

      async first(limit) {
        return toDataset(limit)
      },

      async last(limit) {
        const dataset = await toDataset()
        return dataset.slice(-1 * limit)
      },

      async skip(offset) {
        const dataset = await toDataset()
        return dataset.slice(offset)
      },

      async count() {
        let idx = 0
        let count = 0
        for await (const row of readInterface) {
          try {
            await applyPipeline(row, idx)
            count++
          } catch (e) {}
          idx++
        }
        return count
      },

      async key(property, filterUndefined) {
        const dataset = await toDataset()
        const values = dataset.map(row => row[property])
        if (filterUndefined) {
          return values.filter(Boolean)
        }
        return values
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

        let idx = 0
        for await (const row of readInterface) {
          try {
            const value = await applyPipeline(row, idx)

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
          } catch (e) {}
          idx++
        }

        if (!!stringifier) {
          stringifier.end()
          stringifier.pipe(outputStream)
        }
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
