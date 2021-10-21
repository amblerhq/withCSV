import {withCSV} from '../src/index'
import expect from 'expect'
import {execute, it} from './test-suite'

execute([
  it('should load an array of the "First name" column', async () => {
    expect(await withCSV('test/data/small.csv').query(['First name']).toArray()).toEqual([
      {'First name': 'Aloysius'},
      {'First name': 'University'},
      {'First name': 'Gramma'},
      {'First name': 'Electric'},
      {'First name': 'Fred'},
      {'First name': 'Betty'},
      {'First name': 'Cecil'},
      {'First name': 'Bif'},
      {'First name': 'Andrew'},
      {'First name': 'Jim'},
      {'First name': 'Art'},
      {'First name': 'Jim'},
      {'First name': 'Ima'},
      {'First name': 'Benny'},
      {'First name': 'Boy'},
      {'First name': 'Harvey'},
    ])
  }),
  it('should accept a buffer as first input', async () => {
    const buffer = Buffer.from('Foo,Bar\n1,2\n3,4')
    expect(await withCSV(buffer).query(['Foo', 'Bar']).toArray()).toEqual([
      {Foo: '1', Bar: '2'},
      {Foo: '3', Bar: '4'},
    ])
  }),
])
