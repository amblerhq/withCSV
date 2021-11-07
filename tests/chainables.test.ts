import {withCSV} from '../src/index'
import expect from 'expect'
import {execute, it} from '.'

const bufferData = `First name,Last name,Age
John,Snow,24
John,Doe,21
Aria,Stark,12
`

const dupesData = `First name,Last name,Age
John,Doe,21
John,Snow,24
John,Snow,24
John,Doe,21
Aria,Stark,12
`

execute('Chainable methods', [
  it('should deduplicate the rows', async () => {
    const buffer = Buffer.from(dupesData)
    // Dedup against the whole row
    expect(await withCSV(buffer).query().uniq().toArray()).toEqual([
      {
        'First name': 'John',
        'Last name': 'Doe',
        Age: '21',
      },
      {
        'First name': 'John',
        'Last name': 'Snow',
        Age: '24',
      },
      {
        'First name': 'Aria',
        'Last name': 'Stark',
        Age: '12',
      },
    ])
    // Dedup against the First Name column
    expect(
      await withCSV(buffer)
        .query()
        .uniq(row => row['First name'])
        .toArray(),
    ).toEqual([
      {
        'First name': 'John',
        'Last name': 'Doe',
        Age: '21',
      },
      {
        'First name': 'Aria',
        'Last name': 'Stark',
        Age: '12',
      },
    ])
  }),
  it('should filter the rows', async () => {
    const buffer = Buffer.from(bufferData)
    expect(
      await withCSV(buffer)
        .query()
        .filter(row => row['First name'] === 'John')
        .toArray(),
    ).toEqual([
      {
        'First name': 'John',
        'Last name': 'Snow',
        Age: '24',
      },
      {
        'First name': 'John',
        'Last name': 'Doe',
        Age: '21',
      },
    ])
  }),
  it('should map the rows to a different shape', async () => {
    const buffer = Buffer.from(bufferData)
    expect(
      await withCSV(buffer)
        .query(['First name', 'Last name'])
        .map(row => `${row['First name']} - ${row['Last name']}`)
        .toArray(),
    ).toEqual(['John - Snow', 'John - Doe', 'Aria - Stark'])
  }),
  it('should execute an operation for each row without altering their value', async () => {
    let totalAge = 0
    const buffer = Buffer.from(bufferData)
    expect(
      await withCSV(buffer)
        .query()
        .forEach(row => {
          totalAge += parseInt(row['Age'])
        })
        .toArray(),
    ).toEqual([
      {
        'First name': 'John',
        'Last name': 'Snow',
        Age: '24',
      },
      {
        'First name': 'John',
        'Last name': 'Doe',
        Age: '21',
      },
      {
        'First name': 'Aria',
        'Last name': 'Stark',
        Age: '12',
      },
    ])
    expect(totalAge).toBe(57)
  }),
])
