import {ReadStream, createReadStream} from 'fs'
import csv from 'csv-parser'
import {Readable} from 'stream'

export function getInterface(csvSource: string | Buffer | ReadStream, options?: Parameters<typeof csv>[0]) {
  const stream = (() => {
    if (csvSource instanceof ReadStream) {
      return csvSource
    }

    if (typeof csvSource === 'string') {
      return createReadStream(csvSource, {encoding: 'utf-8'})
    }

    return Readable.from(csvSource)
  })()

  if (!stream) {
    throw new Error('Input should be a string path, a Buffer or a ReadStream')
  }

  return stream.pipe(csv(options))
}
