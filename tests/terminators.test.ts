import expect from 'expect'
import {withCSV} from '../src/index'
import {execute, it} from '.'

const bufferData = `First name,Last name,Age
John,Snow,24
John,Doe,21
Aria,Stark,12
`

execute('Terminator methods', [
  it('should find a row within the CSV data', async () => {
    console.log(bufferData)
    const buffer = Buffer.from(bufferData)
    console.log(2)
    expect(
      await withCSV(buffer)
        .query()
        .find(row => row['First name'] === 'Aria'),
    ).toEqual({
      'First name': 'Aria',
      'Last name': 'Stark',
      Age: '12',
    })
    console.log(3)
    expect(
      await withCSV(buffer)
        .query()
        .find(row => row['First name'] === 'Carlos'),
    ).toBeNull()
    console.log(4)
  }),
  it('should find if some or every row respects a given condition', async () => {
    const buffer = Buffer.from(bufferData)
    expect(
      await withCSV(buffer)
        .query()
        .every(row => row['First name'] === 'Aria'),
    ).toBe(false)
    expect(
      await withCSV(buffer)
        .query()
        .some(row => row['First name'] === 'Aria'),
    ).toBe(true)
  }),
  it('should determine if a value is included in one of the rows', async () => {
    // Primitive include
    const buffer = Buffer.from(bufferData)
    expect(
      await withCSV(buffer)
        .query()
        .map(row => row['First name'])
        .includes('Aria'),
    ).toBe(true)
    // Object include
    expect(
      await withCSV(buffer).query().includes({
        'First name': 'Aria',
        'Last name': 'Stark',
        Age: '12',
      }),
    ).toBe(true)
    expect(
      await withCSV(buffer).query().includes({
        'First name': 'Carlos',
        'Last name': 'Matos',
        Age: '43',
      }),
    ).toBe(false)
  }),
])
