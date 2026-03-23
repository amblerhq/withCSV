import expect from 'expect'
import { execute, it } from '..'
import { withCSV } from '../../src'
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

const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 1))

execute('Async callbacks', [
  it('map with async callback', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name'])
      .map(async (row) => {
        const name = await delay(row.name)
        return { ...row, name: name?.toUpperCase() }
      })
      .rows()

    expect(result).toEqual([
      { id: '1', name: 'JOE' },
      { id: '2', name: 'MIKE' },
      { id: '3', name: 'ALFRED' },
      { id: '4', name: 'MARCEL' },
    ])
  }),

  it('filter with async predicate', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .filter(async (row) => {
        const age = await delay(parseInt(row.age!))
        return age > 20
      })
      .rows()

    expect(result).toEqual([
      { id: '1', name: 'Joe', age: '23' },
      { id: '2', name: 'Mike', age: '25' },
      { id: '3', name: 'Alfred', age: '67' },
    ])
  }),

  it('forEach with async side effect', async () => {
    const collected: string[] = []

    const result = await withCSV(csv)
      .columns(['id', 'name'])
      .forEach(async (row) => {
        const name = await delay(row.name!)
        collected.push(name)
      })
      .rows()

    expect(collected).toEqual(['Joe', 'Mike', 'Alfred', 'Marcel'])
    expect(result.length).toBe(4)
  }),

  it('uniq with async callback', async () => {
    const csvWithDuplicates = inMemoryCSV(
      ['id', 'name', 'score'],
      [
        ['1', 'Joe', '10'],
        ['2', 'Mike', '20'],
        ['3', 'Alfred', '10'],
        ['4', 'Marcel', '30'],
      ],
    )

    const result = await withCSV(csvWithDuplicates)
      .columns(['id', 'name', 'score'])
      .uniq(async (row) => {
        return await delay(row.score!)
      })
      .rows()

    expect(result.length).toBe(3)
    expect(result[0]).toEqual({ id: '1', name: 'Joe', score: '10' })
    expect(result[1]).toEqual({ id: '2', name: 'Mike', score: '20' })
    expect(result[2]).toEqual({ id: '4', name: 'Marcel', score: '30' })
  }),

  it('find with async predicate', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .find(async (row) => {
        const name = await delay(row.name)
        return name === 'Alfred'
      })

    expect(result).toEqual({ id: '3', name: 'Alfred', age: '67' })
  }),

  it('findIndex with async predicate', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name'])
      .findIndex(async (row) => {
        const name = await delay(row.name)
        return name === 'Alfred'
      })

    expect(result).toBe(2)
  }),

  it('every with async predicate', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .every(async (row) => {
        const age = await delay(parseInt(row.age!))
        return age > 0
      })

    expect(result).toBe(true)
  }),

  it('some with async predicate', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .some(async (row) => {
        const age = await delay(parseInt(row.age!))
        return age > 50
      })

    expect(result).toBe(true)
  }),

  it('mixed sync and async pipeline steps', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .filter(async (row) => {
        const age = await delay(parseInt(row.age!))
        return age > 10
      })
      .map((row) => row.name)
      .rows()

    expect(result).toEqual(['Joe', 'Mike', 'Alfred'])
  }),
])
