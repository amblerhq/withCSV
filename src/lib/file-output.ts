import { Stringifier as CSVStringifier, stringify as csvStringify, Options as CSVStringifyOptions } from 'csv-stringify'
import { createWriteStream, WriteStream } from 'fs'

type RowIterator<PipelineOutput> = () => AsyncGenerator<{ value: PipelineOutput; idx: number }>

export function fileOutput<PipelineOutput>(getRows: RowIterator<PipelineOutput>) {
  return {
    async toJSONFile(jsonTarget: string | WriteStream, stringifier = (row: PipelineOutput) => JSON.stringify(row, null, 2)) {
      const outputStream =
        jsonTarget instanceof WriteStream ? jsonTarget : createWriteStream(jsonTarget, { encoding: 'utf-8' })

      function drain() {
        return new Promise<void>((resolve) => outputStream.once('drain', resolve))
      }

      function finish() {
        return new Promise<void>((resolve, reject) => {
          outputStream.on('finish', resolve)
          outputStream.on('error', reject)
          outputStream.end()
        })
      }

      outputStream.write('[')
      let first = true
      let error: unknown

      try {
        for await (const { value } of getRows()) {
          let chunk = ''

          if (first) {
            first = false
          } else {
            chunk = ','
          }

          chunk += stringifier(value)

          if (!outputStream.write(chunk)) {
            await drain()
          }
        }

        outputStream.write(']')
      } catch (e) {
        error = e
      } finally {
        await finish()
      }

      if (error) throw error
    },

    async toCSVFile(csvTarget: string | WriteStream, stringifyOptions?: CSVStringifyOptions) {
      const outputStream =
        csvTarget instanceof WriteStream ? csvTarget : createWriteStream(csvTarget, { encoding: 'utf-8' })

      let stringifier: CSVStringifier | undefined
      let columnOrder: string[] | undefined

      try {
        for await (const { value } of getRows()) {
          if (!stringifier) {
            columnOrder = Object.keys(value as any)
            const options: CSVStringifyOptions = stringifyOptions ?? {
              header: true,
              columns: columnOrder,
            }

            stringifier = csvStringify(options)
            stringifier.pipe(outputStream)
          }

          const row = stringifyOptions
            ? value
            : columnOrder!.map((key) => (value as any)[key])

          if (!stringifier.write(row)) {
            await new Promise<void>((resolve) => stringifier!.once('drain', resolve))
          }
        }
      } finally {
        if (!stringifier && stringifyOptions) {
          stringifier = csvStringify(stringifyOptions)
          stringifier.pipe(outputStream)
        }

        if (stringifier) {
          await new Promise<void>((resolve, reject) => {
            outputStream.on('finish', resolve)
            outputStream.on('error', reject)
            stringifier!.end()
          })
        } else {
          await new Promise<void>((resolve, reject) => {
            outputStream.on('finish', resolve)
            outputStream.on('error', reject)
            outputStream.end()
          })
        }
      }
    },
  }
}
