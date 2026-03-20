import csv from 'csv-parser'
import { ReadStream } from 'fs'
import { getInstance, PipelineMethod } from './lib/get-instance'
import { getInterface } from './utils/get-interface'

export { CSVError } from './utils/errors'
export type { RowError } from './utils/errors'

export type ErrorPolicy = 'ignore' | 'throw-early' | 'throw-late'
const defaultErrorPolicy: ErrorPolicy = 'throw-late'

export function withCSV(
  source: string | Buffer | ReadStream,
  options?: {
    csv?: csv.Options | readonly string[]
    errors?: ErrorPolicy
  },
) {
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
