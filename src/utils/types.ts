import { Options as StringifyOptions } from 'csv-stringify'
import { WriteStream } from 'fs'

export type ErrorPolicy = 'ignore' | 'throw-early' | 'throw-late'

export type Predicate<T, U> = (value: T, index: number) => U | Promise<U>

export type WithCSVInstance<PipelineOutput> = {
  /** Remove duplicate rows. Accepts a column name, an array of column names, or a callback to compute the deduplication key. */
  uniq<Column extends keyof PipelineOutput>(
    iterator?: Predicate<PipelineOutput, unknown> | Column | Column[],
  ): WithCSVInstance<PipelineOutput>
  /** Keep only rows for which the callback returns `true`. */
  filter(cb: Predicate<PipelineOutput, boolean>): WithCSVInstance<PipelineOutput>
  /** Transform each row into a new value. */
  map<CallbackOutput>(cb: Predicate<PipelineOutput, CallbackOutput>): WithCSVInstance<CallbackOutput>
  /** Keep only the specified columns. */
  pick: <Column extends keyof PipelineOutput>(
    keys: Column | Column[],
  ) => WithCSVInstance<Record<Column, PipelineOutput[Column]>>
  /** Execute a side-effect for each row without altering the pipeline output. */
  forEach(cb: Predicate<PipelineOutput, void>): WithCSVInstance<PipelineOutput>

  /** Consume all rows, executing the pipeline for side-effects only. */
  run: () => Promise<void>
  /** Return the first row matching the predicate, or `null`. */
  find: (cb: Predicate<PipelineOutput, boolean>) => Promise<PipelineOutput | null>
  /** Return the index of the first row matching the predicate, or `-1`. */
  findIndex: (cb: Predicate<PipelineOutput, boolean>) => Promise<number>
  /** Return `true` if every row matches the predicate. */
  every: (cb: Predicate<PipelineOutput, boolean>) => Promise<boolean>
  /** Return `true` if at least one row matches the predicate. */
  some: (cb: Predicate<PipelineOutput, boolean>) => Promise<boolean>
  /** Return `true` if the dataset contains a row deeply equal to `value`. */
  includes: (value: PipelineOutput) => Promise<boolean>

  /** Collect all rows into an array. */
  rows: () => Promise<PipelineOutput[]>
  /** Extract a single property from each row into an array. */
  pluck: <U extends keyof PipelineOutput>(property: U, filterUndefined?: true) => Promise<PipelineOutput[U][]>
  /** Stream all rows to a JSON file. */
  toJSONFile: (jsonTarget: string | WriteStream, stringifier?: (row: PipelineOutput) => string) => Promise<void>
  /** Stream all rows to a CSV file. */
  toCSVFile: (csvTarget: string | WriteStream, options?: StringifyOptions) => Promise<void>

  /** Return the first `limit` rows. */
  first: (limit?: number) => Promise<PipelineOutput[]>
  /** Return the last `n` rows. */
  last: (n: number) => Promise<PipelineOutput[]>
  /** Skip the first `n` rows, return the rest. */
  skip: (n: number) => Promise<PipelineOutput[]>
  /** Count the total number of rows. */
  count: () => Promise<number>
}
