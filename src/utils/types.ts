import {Options as StringifyOptions} from 'csv-stringify'
import {WriteStream} from 'fs'

export type Predicate<T, U> = (value: T, index: number) => U | Promise<U>

export type WithCSVInstance<PipelineOutput> = {
  uniq<Column extends keyof PipelineOutput>(
    iterator?: Predicate<PipelineOutput, string> | Column | Column[],
  ): WithCSVInstance<PipelineOutput>
  filter(cb: Predicate<PipelineOutput, boolean>): WithCSVInstance<PipelineOutput>
  map<CallbackOutput>(cb: Predicate<PipelineOutput, CallbackOutput>): WithCSVInstance<CallbackOutput>
  pick: <Column extends keyof PipelineOutput>(
    keys: Column | Column[],
  ) => WithCSVInstance<Record<Column, PipelineOutput[Column]>>
  forEach(cb: Predicate<PipelineOutput, void>): WithCSVInstance<PipelineOutput>

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
  key: <U extends keyof PipelineOutput>(property: U, filterUndefined?: true) => Promise<PipelineOutput[U][]>
  // toJSON: (replacer?: (number | string)[] | null, space?: string | number) => Promise<string>
  toCSV: (csvTarget: string | WriteStream, options?: StringifyOptions) => Promise<void>

  first: (limit?: number) => Promise<PipelineOutput[]>
  last: (n: number) => Promise<PipelineOutput[]>
  skip: (n: number) => Promise<PipelineOutput[]>
  count: () => Promise<number>
}
