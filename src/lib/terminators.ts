import { isDeepStrictEqual } from 'node:util'
import { CSVError } from '../utils/errors'

type RowIterator<PipelineOutput> = () => AsyncGenerator<{ value: PipelineOutput; idx: number }>

export function terminators<PipelineOutput>(getRows: RowIterator<PipelineOutput>) {
  return {
    async run() {
      let processed = 0

      try {
        for await (const _ of getRows()) {
          processed++
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = processed
          throw error
        }
        throw error
      }
    },

    async find(callback: (value: PipelineOutput, idx: number) => Promise<boolean> | boolean) {
      try {
        for await (const { value, idx } of getRows()) {
          if (await callback(value, idx)) {
            return value
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = null
          throw error
        }
        throw error
      }

      return null
    },

    async findIndex(callback: (value: PipelineOutput, idx: number) => Promise<boolean> | boolean) {
      try {
        for await (const { value, idx } of getRows()) {
          if (await callback(value, idx)) {
            return idx
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = -1
          throw error
        }
        throw error
      }

      return -1
    },

    async every(callback: (value: PipelineOutput, idx: number) => Promise<boolean> | boolean) {
      try {
        for await (const { value, idx } of getRows()) {
          if (!(await callback(value, idx))) {
            return false
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = false
          throw error
        }
        throw error
      }

      return true
    },

    async some(callback: (value: PipelineOutput, idx: number) => Promise<boolean> | boolean) {
      try {
        for await (const { value, idx } of getRows()) {
          if (await callback(value, idx)) {
            return true
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = false
          throw error
        }
        throw error
      }

      return false
    },

    async includes(searchedValue: PipelineOutput) {
      try {
        for await (const { value } of getRows()) {
          if (isDeepStrictEqual(value, searchedValue)) {
            return true
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = false
          throw error
        }
        throw error
      }

      return false
    },

    async rows() {
      const dataset: PipelineOutput[] = []

      try {
        for await (const { value } of getRows()) {
          dataset.push(value)
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = dataset
          throw error
        }
        throw error
      }

      return dataset
    },

    async first(limit = 1) {
      const subset: PipelineOutput[] = []

      for await (const { value } of getRows()) {
        subset.push(value)

        if (subset.length >= limit) {
          break
        }
      }

      return subset
    },

    async last(limit = 1) {
      const buffer = new Array<PipelineOutput>(limit)
      let count = 0

      function drain(n: number): PipelineOutput[] {
        const total = Math.min(n, limit)
        const start = n % limit
        const result = new Array<PipelineOutput>(total)
        for (let i = 0; i < total; i++) {
          result[i] = buffer[(start + i) % limit]
        }
        return result
      }

      try {
        for await (const { value } of getRows()) {
          buffer[count % limit] = value
          count++
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = drain(count)
          throw error
        }
        throw error
      }

      return drain(count)
    },

    async skip(offset = 1) {
      const subset: PipelineOutput[] = []

      try {
        for await (const { value, idx } of getRows()) {
          if (idx >= offset) {
            subset.push(value)
          }
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = subset
          throw error
        }
        throw error
      }

      return subset
    },

    async count() {
      let count = 0

      try {
        for await (const _ of getRows()) {
          count++
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = count
          throw error
        }
        throw error
      }

      return count
    },

    async pluck(property: keyof PipelineOutput, filterUndefined?: boolean) {
      const subset: PipelineOutput[typeof property][] = []

      try {
        for await (const { value } of getRows()) {
          const keyValue = value[property]

          if (keyValue === undefined && filterUndefined) {
            continue
          }

          subset.push(keyValue)
        }
      } catch (error) {
        if (error instanceof CSVError) {
          error.results = subset
          throw error
        }
        throw error
      }

      return subset
    },
  }
}
