import {withCSV} from '../src/index'
import expect from 'expect'
import {execute, it} from '.'

const jsonData = require('./data/small.json')
const bufferData = `Foo,Bar
1,2
3,4
`

execute('Core library', [
  it('should load data from a file', async () => {
    expect(await withCSV('tests/data/small.csv').get()).toEqual(jsonData)
  }),
  it('should load data from a Buffer', async () => {
    const buffer = Buffer.from(bufferData)
    expect(await withCSV(buffer).get()).toEqual([
      {Foo: '1', Bar: '2'},
      {Foo: '3', Bar: '4'},
    ])
  }),
])
