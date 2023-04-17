import {Options as StringifyOptions} from 'csv-stringify'
import {WriteStream} from 'fs'

export type Predicate<T, U> = (value: T, index: number) => U | Promise<U>

export type CsvRowsCollection<T> = {
  /**
   * Chainable methods
   */
  uniq<U extends keyof T>(iterator?: Predicate<T, string> | U | U[]): CsvRowsCollection<T>
  filter(cb: Predicate<T, boolean>): CsvRowsCollection<T>
  map<U>(cb: Predicate<T, U>): CsvRowsCollection<U>
  pick: <U extends keyof T>(keys: U | U[]) => CsvRowsCollection<Record<U, string>>
  forEach(cb: Predicate<T, void>): CsvRowsCollection<T>

  /**
   * Terminator methods
   */
  process: () => Promise<void>
  find: (cb: Predicate<T, boolean>) => Promise<T | null>
  findIndex: (cb: Predicate<T, boolean>) => Promise<number>
  every: (cb: Predicate<T, boolean>) => Promise<boolean>
  some: (cb: Predicate<T, boolean>) => Promise<boolean>
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
