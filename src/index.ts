import fs from 'fs'
import pick from 'lodash.pick'
import isEqual from 'lodash.isequal'
import csv from 'csv-parser'

type ArrayMethod<T, U> = (value: T, index?: number) => U | Promise<U>

type PipelineMethod<T> = (
  row: T,
  idx: number,
) => Promise<{
  continueChain: boolean
  value: T
}>

type CsvRowsCollection<T> = {
  /**
   * Chainable methods
   */
  filter(cb: ArrayMethod<T, boolean>): CsvRowsCollection<T>
  map<U>(cb: ArrayMethod<T, U>): CsvRowsCollection<U>
  forEach(cb: ArrayMethod<T, void>): CsvRowsCollection<T>

  /**
   * Terminator methods
   */
  find: (cb: ArrayMethod<T, boolean>) => Promise<T | null>
  every: (cb: ArrayMethod<T, boolean>) => Promise<boolean>
  some: (cb: ArrayMethod<T, boolean>) => Promise<boolean>
  includes: (value: T) => Promise<boolean>
  toArray: () => Promise<T[]>
  toJSON: (space?: string | number) => Promise<string>
  process: () => Promise<void>
}

export function withCSV(csvFile: string, options?: csv.Options | readonly string[]) {
  const fileStream = fs.createReadStream(csvFile, {encoding: 'utf-8'})
  const readInterface = fileStream.pipe(csv(options))
  const pipeline: PipelineMethod<any>[] = []

  function getQueryChain<T>() {
    async function applyPipeline(
      row: T,
      idx: number,
    ): Promise<{
      finishedTheChain: boolean
      value: T
    }> {
      let finalValue = row
      // First apply the pipeline to each row to filter/map it
      let finishedTheChain = true
      for (const operation of pipeline) {
        const {continueChain, value} = await operation(finalValue, idx)
        finalValue = value
        if (!continueChain) {
          return {finishedTheChain: false, value: finalValue}
        }
      }
      return {finishedTheChain, value: finalValue}
    }

    async function toDataset(): Promise<T[]> {
      const dataSet: T[] = []
      let idx = 0
      for await (const row of readInterface) {
        const {finishedTheChain, value} = await applyPipeline(row, idx)
        if (finishedTheChain) {
          dataSet.push(value)
        }
        idx++
      }
      return dataSet
    }

    const queryChain: CsvRowsCollection<T> = {
      /**
       * Chainable methods
       */
      filter(callback: ArrayMethod<T, boolean>) {
        pipeline.push(async function filter_(value: T, index: number) {
          if (await callback(value, index)) {
            return {continueChain: true, value}
          }
          return {continueChain: false, value: null}
        })
        return getQueryChain<T>()
      },
      map<U>(callback: ArrayMethod<T, U>) {
        pipeline.push(async function map_(value: T, index: number) {
          return {
            continueChain: true,
            value: await callback(value, index),
          }
        })
        return getQueryChain<U>()
      },
      forEach(callback: ArrayMethod<T, void>) {
        pipeline.push(async function forEach_(value: T, index: number) {
          await callback(value, index)
          return {continueChain: true, value}
        })
        return getQueryChain<T>()
      },
      /**
       * Terminator methods
       */
      async find(callback: ArrayMethod<T, boolean>) {
        let idx = 0
        for await (const row of readInterface) {
          // Apply the pipeline to see if the row is filtered out
          const {finishedTheChain, value} = await applyPipeline(row, idx)
          // Row has finished the chain so it hasn't been filtered out,
          // Apply the find and stop reading rows
          if (finishedTheChain && (await callback(value))) {
            return value
          }
          idx++
        }
        return null
      },
      async every(callback: ArrayMethod<T, boolean>) {
        let idx = 0
        for await (const row of readInterface) {
          // Apply the pipeline to see if the row is filtered out
          const {finishedTheChain, value} = await applyPipeline(row, idx)
          if (finishedTheChain && !(await callback(value))) {
            return false
          }
          idx++
        }
        return true
      },
      async some(callback: ArrayMethod<T, boolean>) {
        let idx = 0
        for await (const row of readInterface) {
          // Apply the pipeline to see if the row is filtered out
          const {finishedTheChain, value} = await applyPipeline(row, idx)
          if (finishedTheChain && (await callback(value))) {
            return true
          }
          idx++
        }
        return false
      },
      async includes(searchedValue: T) {
        let idx = 0
        for await (const row of readInterface) {
          // Apply the pipeline to see if the row is filtered out
          const {finishedTheChain, value} = await applyPipeline(row, idx)
          // Row has finished the chain so it hasn't been filtered out,
          // Perform isEqual, stop reading rows if found
          if (finishedTheChain && isEqual(value, searchedValue)) {
            return true
          }
          idx++
        }
        return false
      },
      async toArray() {
        return toDataset()
      },
      async toJSON(space?: string | number) {
        const dataSet = await toDataset()
        return JSON.stringify(dataSet, null, space)
      },
      async process() {
        let idx = 0
        for await (const row of readInterface) {
          await applyPipeline(row, idx)
          idx++
        }
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
