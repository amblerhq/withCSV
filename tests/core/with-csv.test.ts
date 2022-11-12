import {withCSV} from '../../src/index'
import expect from 'expect'
import {execute, it} from '..'

execute('Basic functions', [
  it('opens a CSV file from its path', async () => {
    const result = await withCSV('tests/core/small.csv').columns(['First name']).rows()

    expect(result.length).toBe(5)
  }),

  it('takes a buffer as input', async () => {
    const buffer = Buffer.from('Foo,Bar\n1,2\n3,4')

    const result = await withCSV(buffer).columns(['Foo', 'Bar']).rows()

    expect(result).toEqual([
      {Foo: '1', Bar: '2'},
      {Foo: '3', Bar: '4'},
    ])
  }),

  it('selects the specified columns', async () => {
    const result = await withCSV('tests/core/small.csv').columns(['First name']).rows()

    expect(result).toEqual([
      {'First name': 'Aloysius'},
      {'First name': 'University'},
      {'First name': 'Benny'},
      {'First name': 'Boy'},
      {'First name': 'Harvey'},
    ])
  }),
])
