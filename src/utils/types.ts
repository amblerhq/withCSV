import {Options as StringifyOptions} from 'csv-stringify'
import {WriteStream} from 'fs'

export type OnErrorPolicy = 'throw-first' | 'throw-all' | 'throw-none'

export type Predicate<T, U> = (value: T, index: number) => U | Promise<U>

export type CsvRowsCollection<PipelineOutput> = {
  /**
   * Sets the policy for when a callback in the chain throws an error
   * @param policy:
   *   * "throw-first" will stop processing the CSV and throw on the first error
   *   * "throw-all" will continue processing the CSV and throw an error at the end, containing all valid results and all errors encountered
   *   * "throw-none" will ignore all errors and process as many CSV rows as possible
   */
  onError(policy: OnErrorPolicy): CsvRowsCollection<PipelineOutput>
  /**
   * Deduplicates the CSV data. By default it will stringify and
   * @param iterator
   */
  uniq<Column extends keyof PipelineOutput>(
    iterator?: Predicate<PipelineOutput, string> | Column | Column[],
  ): CsvRowsCollection<PipelineOutput>
  filter(cb: Predicate<PipelineOutput, boolean>): CsvRowsCollection<PipelineOutput>
  map<CallbackOutput>(cb: Predicate<PipelineOutput, CallbackOutput>): CsvRowsCollection<CallbackOutput>
  pick: <Column extends keyof PipelineOutput>(keys: Column | Column[]) => CsvRowsCollection<Record<Column, string>>
  forEach(cb: Predicate<PipelineOutput, void>): CsvRowsCollection<PipelineOutput>

  /**
   * Terminator methods
   */
  process: () => Promise<void>
  find: (cb: Predicate<PipelineOutput, boolean>) => Promise<PipelineOutput | null>
  findIndex: (cb: Predicate<PipelineOutput, boolean>) => Promise<number>
  every: (cb: Predicate<PipelineOutput, boolean>) => Promise<boolean>
  some: (cb: Predicate<PipelineOutput, boolean>) => Promise<boolean>
  includes: (value: PipelineOutput) => Promise<boolean>
  rows: () => Promise<PipelineOutput[]>
  toJSON: (replacer?: (number | string)[] | null, space?: string | number) => Promise<string>
  toCSV: (csvTarget: string | WriteStream, options?: StringifyOptions) => Promise<void>
  key: <U extends keyof PipelineOutput>(property: U, filterUndefined?: true) => Promise<PipelineOutput[U][]>
  first: (n: number) => Promise<PipelineOutput[]>
  last: (n: number) => Promise<PipelineOutput[]>
  skip: (n: number) => Promise<PipelineOutput[]>
  count: () => Promise<number>
}
