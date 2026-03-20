import expect from 'expect'
import { readFileSync, unlinkSync } from 'fs'
import { execute, it } from '..'
import { withCSV } from '../../src'
import { inMemoryCSV } from '../../src/utils/in-memory-csv'

const csv = inMemoryCSV(
  ['id', 'name', 'age'],
  [
    ['1', 'Joe', '23'],
    ['2', 'Mike', '25'],
    ['3', 'Alfred', '67'],
  ],
)

const tmpJSON = '/tmp/withcsv-test-output.json'
const tmpCSV = '/tmp/withcsv-test-output.csv'

function cleanup(path: string) {
  try {
    unlinkSync(path)
  } catch {}
}

execute('File output methods', [
  it('toJSONFile writes a valid JSON array', async () => {
    cleanup(tmpJSON)

    await withCSV(csv).columns(['id', 'name']).toJSONFile(tmpJSON)

    // Small delay to let the stream flush

    const content = readFileSync(tmpJSON, 'utf-8')
    const parsed = JSON.parse(content)

    expect(parsed).toEqual([
      { id: '1', name: 'Joe' },
      { id: '2', name: 'Mike' },
      { id: '3', name: 'Alfred' },
    ])

    cleanup(tmpJSON)
  }),

  it('toJSONFile with custom stringifier', async () => {
    cleanup(tmpJSON)

    await withCSV(csv)
      .columns(['id', 'name'])
      .toJSONFile(tmpJSON, row => JSON.stringify(row))


    const content = readFileSync(tmpJSON, 'utf-8')
    const parsed = JSON.parse(content)

    expect(parsed).toEqual([
      { id: '1', name: 'Joe' },
      { id: '2', name: 'Mike' },
      { id: '3', name: 'Alfred' },
    ])

    cleanup(tmpJSON)
  }),

  it('toCSVFile writes a valid CSV file', async () => {
    cleanup(tmpCSV)

    await withCSV(csv).columns(['id', 'name']).toCSVFile(tmpCSV)

    // Small delay to let the stream flush

    const content = readFileSync(tmpCSV, 'utf-8')
    const lines = content.trim().split('\n')

    expect(lines[0]).toBe('id,name')
    expect(lines[1]).toBe('1,Joe')
    expect(lines[2]).toBe('2,Mike')
    expect(lines[3]).toBe('3,Alfred')

    cleanup(tmpCSV)
  }),

  it('toCSVFile round-trip: write then read back', async () => {
    cleanup(tmpCSV)

    await withCSV(csv).columns(['id', 'name', 'age']).toCSVFile(tmpCSV)


    const result = await withCSV(tmpCSV).columns(['id', 'name', 'age']).rows()

    expect(result).toEqual([
      { id: '1', name: 'Joe', age: '23' },
      { id: '2', name: 'Mike', age: '25' },
      { id: '3', name: 'Alfred', age: '67' },
    ])

    cleanup(tmpCSV)
  }),

  it('toJSONFile with pipeline transformations', async () => {
    cleanup(tmpJSON)

    await withCSV(csv)
      .columns(['id', 'name', 'age'])
      .filter(row => parseInt(row.age!) > 24)
      .map(row => ({ name: row.name!, age: parseInt(row.age!) }))
      .toJSONFile(tmpJSON)


    const content = readFileSync(tmpJSON, 'utf-8')
    const parsed = JSON.parse(content)

    expect(parsed).toEqual([
      { name: 'Mike', age: 25 },
      { name: 'Alfred', age: 67 },
    ])

    cleanup(tmpJSON)
  }),
])
