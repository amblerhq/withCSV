import csv from 'csv-parser'
import {ReadStream} from 'fs'
import pick from 'lodash.pick'
import {getInstance, PipelineMethod} from './lib/get-instance'
import {getInterface} from './utils/get-interface'

export type ErrorPolicy = 'ignore' | 'throw-early' | 'throw-late'
const defaultErrorPolicy: ErrorPolicy = 'throw-late'

/**
 *
 * @param source         : can be the path to the CSV file, a Buffer or a ReadStream
 * @param options        :
 * @param options.csv    : valid options for csv-parser
 * @param options.errors : how to handle one of the callbacks throwing an error :
 *                         - ignore      : continue reading CSV rows until the end of the file
 *                         - throw-early : throw on the first error caught
 *                         - throw-late  : continue reading CSV rows and throw at the end of the file
 */
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

async function main() {
  const test = await withCSV('')
    .columns(['name', 'address', 'id'])
    .map((row, idx) => ({
      nombre: row.name,
      direccion: row.address,
      ideo: idx * 2,
    }))
    .pick('ideo')
    .map(test => test)
    .find(row => row.ideo === 2)
}
