import {withCSV} from '../../src/index'
import expect from 'expect'
import {execute, it} from '..'
import {createReadStream} from 'fs'

execute('Basic functions', [
  it('opens a CSV file from its path', async () => {
    const result = await withCSV('tests/fixtures/small.csv').columns(['First name']).rows()

    expect(result.length).toBe(100)
  }),

  it('takes a buffer as input', async () => {
    const buffer = Buffer.from('Foo,Bar\n1,2\n3,4')

    const result = await withCSV(buffer).columns(['Foo', 'Bar']).rows()

    expect(result).toEqual([
      {Foo: '1', Bar: '2'},
      {Foo: '3', Bar: '4'},
    ])
  }),

  it('takes a stream as input', async () => {
    const stream = createReadStream('tests/fixtures/small.csv', {encoding: 'utf-8'})

    const result = await withCSV(stream).columns(['First name']).rows()

    expect(result.length).toBe(100)
  }),

  it('selects the specified columns', async () => {
    const result = await withCSV('tests/fixtures/small.csv').columns(['Last Name']).rows()

    result.forEach(row => {
      expect(Object.keys(row)).toEqual(['Last Name'])
    })
  }),
])
