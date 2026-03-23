import expect from 'expect'
import { execute, it } from '..'
import { withCSV } from '../../src'
import { CSVError } from '../../src/utils/errors'
import { inMemoryCSV } from '../in-memory-csv'

const csv = inMemoryCSV(
  ['id', 'name', 'age'],
  [
    ['1', 'Joe', '23'],
    ['2', 'Mike', '25'],
    ['3', 'Alfred', '67'],
    ['4', 'Marcel', '8'],
  ],
)

function failOnThird(row: Record<string, string | undefined>, idx: number) {
  if (idx === 2) throw new Error('Row 3 failed')
  return row
}

execute('Error propagation on terminators', [
  it('find sets error.results to null on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .find((row) => row.name === 'Nobody')
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(null)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('findIndex sets error.results to -1 on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .findIndex((row) => row.name === 'Nobody')
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(-1)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('every sets error.results to false on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .every(() => true)
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(false)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('some sets error.results to false on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .some(() => false)
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(false)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('includes sets error.results to false on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .includes({ id: '999', name: 'Nobody', age: '0' })
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(false)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('count sets error.results to partial count on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .count()
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(3)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('run sets error.results to partial processed count on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .run()
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.results).toBe(3)
        expect(e.rows.length).toBe(1)
      }
    }
  }),

  it('first does not catch CSVError (no try/catch)', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .first(4)
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
    }
  }),

  it('last sets error.results to partial subset on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .last(2)
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(Array.isArray(e.results)).toBe(true)
        const results = e.results as Record<string, string>[]
        expect(results.length).toBe(2)
      }
    }
  }),

  it('skip sets error.results to partial subset on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .skip(1)
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(Array.isArray(e.results)).toBe(true)
        const results = e.results as Record<string, string>[]
        expect(results.length).toBe(2)
      }
    }
  }),

  it('pluck sets error.results to partial array on throw-late', async () => {
    try {
      await withCSV(csv, { errors: 'throw-late' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .pluck('name')
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(Array.isArray(e.results)).toBe(true)
        const results = e.results as string[]
        expect(results).toEqual(['Joe', 'Mike', 'Marcel'])
      }
    }
  }),

  it('throw-early stops on first error for count', async () => {
    try {
      await withCSV(csv, { errors: 'throw-early' })
        .columns(['id', 'name', 'age'])
        .map(failOnThird)
        .count()
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e instanceof CSVError).toBe(true)
      if (e instanceof CSVError) {
        expect(e.rows.length).toBe(1)
        expect(e.results).toBe(2)
      }
    }
  }),
])
