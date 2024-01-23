import expect from 'expect'
import {execute, inMemoryCSV, it} from '..'
import {withCSV} from '../../src'

const csv = inMemoryCSV(
  ['id', 'name', 'age'],
  [
    ['1', 'Joe', '23'],
    ['2', 'Mike', '25'],
    ['3', 'Alfred', '67'],
    ['4', 'Marcel', '8'],
  ],
)

execute('Chainable methods', [
  it('map', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .map(row => `${row.name} - ${row.age}`)
      .rows()

    expect(result).toEqual(['Joe - 23', 'Mike - 25', 'Alfred - 67', 'Marcel - 8'])
  }),

  it('pick', async () => {
    const result = await withCSV(csv).columns(['id', 'name']).pick('id').rows()

    expect(result).toEqual([{id: '1'}, {id: '2'}, {id: '3'}, {id: '4'}])
  }),

  it('filter', async () => {
    const result = await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .filter(row => row.name.startsWith('M'))
      .rows()

    expect(result).toEqual([
      {id: '2', name: 'Mike', age: '25'},
      {id: '4', name: 'Marcel', age: '8'},
    ])
  }),

  it('forEach', async () => {
    let count = 0

    const result = await withCSV(csv)
      .columns(['id'])
      .forEach(() => {
        count++
      })
      .rows()

    expect(count).toBe(4)
    expect(result).toEqual([{id: '1'}, {id: '2'}, {id: '3'}, {id: '4'}])
  }),

  it('uniq on 1 column name', async () => {
    const csvWithDuplicates = inMemoryCSV(
      ['id', 'name'],
      [
        ['1', 'Joe'],
        ['2', 'Joe'],
        ['3', 'Joe'],
        ['4', 'Mike'],
      ],
    )

    const result = await withCSV(csvWithDuplicates).columns(['id', 'name']).uniq('name').rows()

    const deduplicated = result.filter(row => row.id === '1')

    expect(deduplicated.length).toBe(1)
    expect(deduplicated[0]).toEqual({id: '1', name: 'Joe'})
  }),

  it('uniq on n column names', async () => {
    const csvWithDuplicates = inMemoryCSV(
      ['id', 'name', 'age'],
      [
        ['1', 'Joe', '35'],
        ['2', 'Joe', '2'],
        ['3', 'Joe', '35'],
        ['4', 'Mike', '2'],
      ],
    )

    const result = await withCSV(csvWithDuplicates).columns(['id', 'name', 'age']).uniq(['age', 'name']).rows()

    const deduplicated = result.filter(row => row.age === '35' && row.name === 'Joe')

    expect(deduplicated.length).toBe(1)
    expect(deduplicated[0]).toEqual({id: '1', name: 'Joe', age: '35'})
  }),

  it('uniq with callback', async () => {
    const dataWithDuplicates = inMemoryCSV(
      ['id', 'name', 'quantity1', 'quantity2'],
      [
        ['1', 'Joe', '10', '10'], // total quantity : 20
        ['2', 'Joe', '2', '5'], // total quantity : 7
        ['3', 'Joe', '15', '5'], // total quantity : 20
        ['4', 'Mike', '2', '5'], // total quantity : 7
      ],
    )
    const buffer = Buffer.from(dataWithDuplicates)

    const result = await withCSV(buffer)
      .columns(['quantity1', 'quantity2'])
      .uniq(row => parseInt(row.quantity1) + parseInt(row.quantity2))
      .rows()

    expect(result.length).toBe(2)
    expect(result[0]).toEqual({quantity1: '10', quantity2: '10'})
    expect(result[1]).toEqual({quantity1: '2', quantity2: '5'})
  }),
])
