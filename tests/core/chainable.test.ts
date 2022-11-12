import expect from 'expect'
import {execute, it} from '..'
import {withCSV} from '../../src'

const data = `id,name,age
1,Joe,23
2,Mike,25
3,Alfred,67
4,Marcel,8
`
const dataWithDuplicates = `${data}
1,Joe,23
1,Balthazar,23
23,Balthuzor,1
24,Mike,25
`

execute('Chainable methods', [
  it('map', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .map(row => `${row.name} - ${row.age}`)
      .rows()

    expect(result).toEqual(['Joe - 23', 'Mike - 25', 'Alfred - 67', 'Marcel - 8'])
  }),

  it('pick', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id', 'name']).pick('id').rows()

    expect(result).toEqual([{id: '1'}, {id: '2'}, {id: '3'}, {id: '4'}])
  }),

  it('filter', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .filter(row => row.name.startsWith('M'))
      .rows()

    expect(result).toEqual([
      {id: '2', name: 'Mike', age: '25'},
      {id: '4', name: 'Marcel', age: '8'},
    ])
  }),

  it('forEach', async () => {
    const buffer = Buffer.from(data)
    let count = 0

    const result = await withCSV(buffer)
      .columns(['id'])
      .forEach(() => {
        count++
      })
      .rows()

    expect(count).toBe(4)
    expect(result).toEqual([{id: '1'}, {id: '2'}, {id: '3'}, {id: '4'}])
  }),

  it('uniq with one column name', async () => {
    const buffer = Buffer.from(dataWithDuplicates)

    const result = await withCSV(buffer).columns(['id', 'name', 'age']).uniq('id').rows()

    expect(result.filter(row => row.id === '1').length).toBe(1)
  }),

  it('uniq with n column names', async () => {
    const buffer = Buffer.from(dataWithDuplicates)

    const result = await withCSV(buffer).columns(['id', 'name', 'age']).uniq(['age', 'name']).rows()

    expect(result.filter(row => row.age === '25' && row.name === 'Mike').length).toBe(1)
  }),

  it('uniq with callback', async () => {
    const buffer = Buffer.from(dataWithDuplicates)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .uniq(row => `${parseInt(row.id) + parseInt(row.age)}`)
      .rows()

    expect(result.filter(row => parseInt(row.id) + parseInt(row.age) === 24).length).toBe(1)
  }),
])
