import {createHash} from 'crypto'
import fs from 'fs'
import pick from 'lodash.pick'
import isEqual from 'lodash.isequal'
import csv from 'csv-parser'
import {Readable} from 'stream'
import {BError} from 'berror'

export type ArrayMethod<T, U> = (value: T, index?: number) => U | Promise<U>

type PipelineMethod<T> = (row: T, idx: number) => Promise<T>

type CsvRowsCollection<T> = {
  /**
   * Chainable methods
   */
  uniq(cb?: ArrayMethod<T, any>): CsvRowsCollection<T>
  filter(cb: ArrayMethod<T, boolean>): CsvRowsCollection<T>
  map<U>(cb: ArrayMethod<T, U>): CsvRowsCollection<U>
  forEach(cb: ArrayMethod<T, void>): CsvRowsCollection<T>

  /**
   * Terminator methods
   */
  find(cb: ArrayMethod<T, boolean>): Promise<T | null>
  every(cb: ArrayMethod<T, boolean>): Promise<boolean>
  some(cb: ArrayMethod<T, boolean>): Promise<boolean>
  includes(value: T): Promise<boolean>
  toArray(): Promise<T[]>
  toJSON(space?: string | number): Promise<string>
  // toCSV<U>(options?: {
  //   filename?: U
  //   keys?: (keyof T)[]
  //   formatHeader?: (header: keyof T) => string
  //   separator?: string
  //   skipHeader?: true
  // }): Promise<U extends string ? void : string>
  process(): Promise<void>
}

const hashCache: Set<string> = new Set()

export function withCSV(csvFileOrBuffer: string | Buffer, options?: csv.Options | readonly string[]) {
  let stream: fs.ReadStream | Readable | undefined = undefined
  if (typeof csvFileOrBuffer === 'string') {
    stream = fs.createReadStream(csvFileOrBuffer, {encoding: 'utf-8'})
  } else if (csvFileOrBuffer instanceof Buffer) {
    // Why Readable, _read, push(null) ? See this: https://stackoverflow.com/a/44091532
    stream = new Readable()
    stream._read = () => {} // noop
    stream.push(csvFileOrBuffer)
    stream.push(null)
  }

  if (!stream) {
    throw new BError('Input should be a string path or a buffer', undefined, {csvFileOrBuffer})
  }

  const readInterface = stream.pipe(csv(options))
  const pipeline: PipelineMethod<any>[] = []

  function getQueryChain<T>() {
    async function applyPipeline(row: T, idx: number): Promise<T> {
      let finalValue = row
      // First apply the pipeline to each row to filter/map it
      try {
        for (const operation of pipeline) {
          finalValue = await operation(finalValue, idx)
        }
        return finalValue
      } catch (e) {
        throw e
      }
    }

    // This function is used to power the terminators returning a single value from performing tests on all rows (e.g. find, some, every etc...)
    // If the predicate returns true, then the loop interrupts and valueIfFound (or the value of the row) is returned
    // If no predicate ever returns true, then we go through all the rows and valueIfNotFound is returned
    type Predicate = (value: T) => boolean | Promise<boolean>
    async function checkDataset<U>(predicate: Predicate, valueIfNotFound: U, valueIfFound: U): Promise<U>
    async function checkDataset<U>(predicate: Predicate, valueIfNotFound: U): Promise<U | T>
    async function checkDataset<U>(predicate?: Predicate, valueIfNotFound?: U, valueIfFound?: U) {
      hashCache.clear()
      let idx = 0
      for await (const row of readInterface) {
        try {
          const value = await applyPipeline(row, idx)
          console.log(predicate && (await predicate(value)))
          if (predicate && (await predicate(value))) {
            console.log(valueIfFound !== undefined ? valueIfFound : value)
            return valueIfFound !== undefined ? valueIfFound : value
          }
        } catch (e) {}
        idx++
      }
      return valueIfNotFound
    }

    // This function just loop through all the rows, returning the filtered final values
    async function loopDataset(callback?: (value: T) => void | Promise<void>): Promise<void> {
      hashCache.clear()
      let idx = 0
      for await (const row of readInterface) {
        try {
          const value = await applyPipeline(row, idx)
          callback && (await callback(value))
        } catch (e) {}
        idx++
      }
    }

    // This function just loop through all the rows, returning the filtered final values
    async function toDataset(): Promise<T[]> {
      const dataSet: T[] = []
      await loopDataset(value => {
        dataSet.push(value)
      })
      return dataSet
    }

    const queryChain: CsvRowsCollection<T> = {
      /**
       * Chainable methods are stacked in the pipeline and they will be run for each row
       * They can modify the content of the row by returning a value or filter it from the dataset by throwing an error
       */
      uniq(callback) {
        pipeline.push(async function uniq_(value: T, index: number) {
          const hash = createHash('sha1')
          const rowToHash = callback ? await callback(value, index) : value
          hash.update(JSON.stringify(rowToHash), 'utf8')
          const hashedRow = hash.digest('hex')
          if (hashCache.has(hashedRow)) {
            throw new Error()
          }
          hashCache.add(hashedRow)
          return value
        })
        return getQueryChain<T>()
      },
      filter(callback) {
        pipeline.push(async function filter_(value: T, index: number) {
          if (!(await callback(value, index))) {
            throw new Error()
          }
          return value
        })
        return getQueryChain<T>()
      },
      map<U>(callback: ArrayMethod<T, U>) {
        pipeline.push(async function map_(value: T, index: number) {
          return await callback(value, index)
        })
        return getQueryChain<U>()
      },
      forEach(callback) {
        pipeline.push(async function forEach_(value: T, index: number) {
          await callback(value, index)
          return value
        })
        return getQueryChain<T>()
      },
      /**
       * Terminator methods
       * For reference, the checkDataset method takes a callback with the following signature :
       * - predicate : a function to run on all rows, returning a boolean
       * - valueIfNotFound : returned if no row returns true with the predicate
       * - valueIfFound : returned when a row returns true with the predicate. If not provided, the row will be returned
       */
      async find(callback) {
        console.log('find')
        const result = await checkDataset(callback, null)
        console.log(result)
        return result
      },
      async every(callback) {
        return checkDataset(async value => !(await callback(value)), true, false)
      },
      async some(callback) {
        return checkDataset(async value => await callback(value), false, true)
      },
      async includes(searchedValue) {
        return checkDataset(async value => isEqual(value, searchedValue), false, true)
      },
      async toArray() {
        return toDataset()
      },
      async toJSON(space) {
        const dataSet = await toDataset()
        return JSON.stringify(dataSet, null, space)
      },
      // async toCSV({filename, keys, formatHeader, separator, skipHeader}) {
      //   let keys: keyof T
      //   const keys = options?.keys ?? Object.keys(items[0])
      // },
      async process() {
        await loopDataset()
      },
    }
    return queryChain
  }

  return {
    async get<T extends string>(columns?: T[]) {
      const queryChain = getQueryChain<Record<T, string>>()
      if (columns && columns.length > 0) {
        queryChain.map(value => pick(value, columns))
      }
      return queryChain.toArray()
    },

    query<T extends string>(columns?: T[]) {
      const queryChain = getQueryChain<Record<T, string>>()
      if (columns && columns.length > 0) {
        queryChain.map(value => pick(value, columns))
      }
      return queryChain
    },
  }
}
