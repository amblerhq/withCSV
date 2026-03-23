import expect from 'expect'
import { execute, it } from '..'
import { withCSV } from '../../src'
import { CSVError } from '../../src/utils/errors'
import { inMemoryCSV } from '../../src/utils/in-memory-csv'

// Minimal mock validator: parses id as number, keeps name as string, parses balance as number.
// Throws on NaN values.
function validateRow(row: unknown) {
  const r = row as Record<string, string>
  const id = parseInt(r.id, 10)
  if (isNaN(id)) throw new Error(`Invalid id: "${r.id}"`)

  const name = r.name
  if (!name) throw new Error('Name is required')

  const balance = parseFloat(r.balance)
  if (isNaN(balance)) throw new Error(`Invalid balance: "${r.balance}"`)

  return { id, name, balance }
}

execute('Validate method', [
  it('validate transforms rows through the validator', async () => {
    const csv = inMemoryCSV(
      ['id', 'name', 'balance'],
      [
        ['1', 'Joe', '100.5'],
        ['2', 'Mike', '200'],
      ],
    )

    const result = await withCSV(csv).validate(validateRow).rows()

    expect(result).toEqual([
      { id: 1, name: 'Joe', balance: 100.5 },
      { id: 2, name: 'Mike', balance: 200 },
    ])
  }),

  it('validate + throw-early stops on first invalid row', async () => {
    const csv = inMemoryCSV(
      ['id', 'name', 'balance'],
      [
        ['1', 'Joe', '100'],
        ['2', 'Mike', 'not-a-number'],
        ['3', 'Alfred', 'also-bad'],
      ],
    )

    await withCSV(csv, { errors: 'throw-early' })
      .validate(validateRow)
      .rows()
      .then(() => {
        throw new Error('Should have thrown')
      })
      .catch(e => {
        expect(e instanceof CSVError).toBe(true)
        if (e instanceof CSVError) {
          expect(e.rows.length).toBe(1)
          expect(e.rows[0].idx).toBe(2)
          expect(e.rows[0].message).toBe('Invalid balance: "not-a-number"')
        }
      })
  }),

  it('validate + throw-late collects all errors and returns valid results', async () => {
    const csv = inMemoryCSV(
      ['id', 'name', 'balance'],
      [
        ['1', 'Joe', '100'],
        ['2', 'Mike', 'bad'],
        ['3', 'Alfred', '300'],
        ['4', 'Marcel', ''],
      ],
    )

    await withCSV(csv, { errors: 'throw-late' })
      .validate(validateRow)
      .rows()
      .then(() => {
        throw new Error('Should have thrown')
      })
      .catch(e => {
        expect(e instanceof CSVError).toBe(true)
        if (e instanceof CSVError) {
          expect(e.rows.length).toBe(2)
          expect(e.rows[0].idx).toBe(2)
          expect(e.rows[1].idx).toBe(4)

          const results = e.results as { id: number; name: string; balance: number }[]
          expect(results.length).toBe(2)
          expect(results[0]).toEqual({ id: 1, name: 'Joe', balance: 100 })
          expect(results[1]).toEqual({ id: 3, name: 'Alfred', balance: 300 })
        }
      })
  }),

  it('validate can chain with other methods', async () => {
    const csv = inMemoryCSV(
      ['id', 'name', 'balance'],
      [
        ['1', 'Joe', '100'],
        ['2', 'Mike', '200'],
        ['3', 'Alfred', '300'],
      ],
    )

    const result = await withCSV(csv)
      .validate(validateRow)
      .filter(row => row.balance > 150)
      .map(row => row.name)
      .rows()

    expect(result).toEqual(['Mike', 'Alfred'])
  }),

  it('validate with process runs without returning rows', async () => {
    const csv = inMemoryCSV(
      ['id', 'name', 'balance'],
      [
        ['1', 'Joe', '100'],
        ['2', 'Mike', '200'],
      ],
    )

    let count = 0

    await withCSV(csv)
      .validate(validateRow)
      .forEach(() => {
        count++
      })
      .run()

    expect(count).toBe(2)
  }),
])
