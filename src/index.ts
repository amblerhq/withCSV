import csv from 'csv-parser'
import { ReadStream } from 'fs'
import { getInstance, PipelineMethod } from './lib/get-instance'
import { getInterface } from './utils/get-interface'
import { ErrorPolicy } from './utils/types'

export { CSVError } from './utils/errors'
export type { RowError } from './utils/errors'
export type { ErrorPolicy } from './utils/types'

const defaultErrorPolicy: ErrorPolicy = 'throw-late'

/**
 * Create a withCSV instance from a file path, Buffer, or ReadStream.
 *
 * @param source - Path to a CSV file, a Buffer containing CSV data, or a ReadStream
 * @param options - Optional csv-parser options and error policy
 */
export function withCSV(
  source: string | Buffer | ReadStream,
  options?: {
    csv?: csv.Options | readonly string[]
    errors?: ErrorPolicy
  },
) {
  if (source === null || source === undefined) {
    throw new Error('withCSV: source must be a string path, a Buffer, or a ReadStream')
  }

  if (typeof source === 'string' && source.length === 0) {
    throw new Error('withCSV: file path cannot be an empty string')
  }

  const getCSVInterface = () => getInterface(source, options?.csv)
  const errors = options?.errors ?? defaultErrorPolicy

  return {
    columns<Column extends string>(columns: Column[] | readonly Column[]) {
      type BaseType = Record<string, string>
      const pickColumns = ((value: BaseType) =>
        Object.fromEntries(columns.map(c => [c, value[c]])) as Record<Column, string | undefined>) as unknown as PipelineMethod<
        unknown,
        Record<Column, string | undefined>
      >

      return getInstance({
        getCSVInterface,
        errors,
        pipeline: [pickColumns],
      })
    },

    validate<ValidatorOutput>(validator: PipelineMethod<unknown, ValidatorOutput>) {
      return getInstance({
        getCSVInterface,
        errors,
        pipeline: [validator],
      })
    },
  }
}
