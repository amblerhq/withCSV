import csv from 'csv-parser'
import {ReadStream} from 'fs'
import pick from 'lodash.pick'
import {getInstance, PipelineMethod} from './lib/get-instance'
import {getInterface} from './utils/get-interface'

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

  return {
    columns<Column extends string>(columns: Column[] | readonly Column[]) {
      type BaseType = Record<string, string>
      const pickColumns = ((value: BaseType) => pick(value, columns)) as PipelineMethod<unknown, Record<Column, string>>

      return getInstance({
        getCSVInterface,
        errors: options?.errors ?? defaultErrorPolicy,
        pipeline: [pickColumns],
      })
    },
  }
}

export const inMemoryCSV = (headers: string[], rows: string[][]) => {
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  return Buffer.from(csv)
}
