import expect from 'expect'
import {execute, it} from '..'
import {withCSV} from '../../src'

const data = `id,name,age
1,Joe,23
2,Mike,25
3,Alfred,67
4,Marcel,8
`

execute('Terminator methods', [
  it('process', async () => {
    const buffer = Buffer.from(data)
    let count = 0

    await withCSV(buffer)
      .columns(['id'])
      .forEach(() => {
        count++
      })
      .process()

    expect(count).toBe(4)
  }),

  it('find returns found row', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .find(row => {
        console.log(1, row, row.name === 'Mike')
        return row.name === 'Mike'
      })

    expect(result).toEqual({id: '2', name: 'Mike', age: '25'})
  }),

  it('find returns null', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .find(row => row.name === 'Carmichael')

    expect(result).toEqual(null)
  }),

  it('findIndex returns found row index', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .findIndex(row => row.name === 'Mike')

    expect(result).toBe(1)
  }),

  it('findIndex returns -1', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .findIndex(row => row.name === 'Carmichael')

    expect(result).toBe(-1)
  }),

  it('every returns true', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .every(row => parseInt(row.age) < 150)

    expect(result).toBe(true)
  }),

  it('every returns false', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .every(row => parseInt(row.age) < 50)

    expect(result).toBe(false)
  }),

  it('some returns true', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .some(row => parseInt(row.age) > 50)

    expect(result).toBe(true)
  }),

  it('some returns false', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .some(row => parseInt(row.age) > 150)

    expect(result).toBe(false)
  }),

  it('includes returns false', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id', 'name', 'age']).includes({id: '3', name: 'Alfred', age: '67'})

    expect(result).toBe(true)
  }),

  it('includes returns false', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer)
      .columns(['id', 'name', 'age'])
      .includes({id: '666', name: 'Petyr', age: '3500'})

    expect(result).toBe(false)
  }),

  it('first', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id']).first(2)

    expect(result.length).toBe(2)
    expect(result).toEqual([{id: '1'}, {id: '2'}])
  }),

  it('last', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id']).last(2)

    expect(result.length).toBe(2)
    expect(result).toEqual([{id: '3'}, {id: '4'}])
  }),

  it('skip', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id']).skip(3)

    expect(result.length).toBe(1)
    expect(result).toEqual([{id: '4'}])
  }),

  it('count returns n items', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id']).count()

    expect(result).toBe(4)
  }),

  it('count returns 0 items', async () => {
    const buffer = Buffer.from('')

    const result = await withCSV(buffer).columns(['id']).count()

    expect(result).toBe(0)
  }),

  it('key', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id', 'name']).key('id')

    expect(result).toEqual(['1', '2', '3', '4'])
  }),

  it('toJSON', async () => {
    const buffer = Buffer.from(data)

    const result = await withCSV(buffer).columns(['id']).toJSON()

    expect(result).toBe(`[{"id":"1"},{"id":"2"},{"id":"3"},{"id":"4"}]`)
  }),
])
