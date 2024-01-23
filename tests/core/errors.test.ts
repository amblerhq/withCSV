import expect from 'expect'
import {execute, inMemoryCSV, it} from '..'
import {withCSV} from '../../src'
import {CSVError} from '../../src/utils/errors'

const csv = inMemoryCSV(
  ['id', 'name', 'age'],
  [
    ['1', 'Joe', '23'],
    ['2', 'Mike', '25'],
    ['3', 'Alfred', '67'],
    ['4', 'Marcel', '8'],
  ],
)

execute('Error management', [
  it('throws on the first error with throw-early', async () => {
    const maxLoops = 3
    let loopCount = 0

    await withCSV(csv, {errors: 'throw-early'})
      .columns(['name'])
      .map((row, idx) => {
        if (idx >= maxLoops) {
          throw new Error('Sike !')
        }
        loopCount++
        return row
      })
      .rows()
      .then(() => {
        throw new Error('Test failed : an error should have been thrown')
      })
      .catch(e => {
        expect(loopCount).toEqual(3)
        expect(e.message).toBe('Sike !')
      })
  }),

  it('throws all the errors at the end of the CSV file with throw-late', async () => {
    const maxLoops = 2
    let loopCount = 0

    await withCSV(csv, {errors: 'throw-late'})
      .columns(['name'])
      .map((row, idx) => {
        if (idx >= maxLoops) {
          throw new Error('Sike !')
        }
        loopCount++
        return row
      })
      .rows()
      .then(() => {
        throw new Error('Test failed : an error should have been thrown')
      })
      .catch(e => {
        expect(e instanceof CSVError).toBe(true)

        if (e instanceof CSVError) {
          expect(e.errors.length).toEqual(2)
          expect(e.errors[0].idx).toBe(3)
          expect(e.errors[1].idx).toBe(4)

          const results = e.results as unknown[]
          expect(results.length).toEqual(2)
          expect(results[0]).toEqual({name: 'Joe'})
          expect(results[1]).toEqual({name: 'Mike'})
        }
      })
  }),

  it('ignores all errors with ignore', async () => {
    const maxLoops = 2
    let loopCount = 0

    const results = await withCSV(csv, {errors: 'ignore'})
      .columns(['name'])
      .map((row, idx) => {
        if (idx >= maxLoops) {
          throw new Error('Sike !')
        }
        loopCount++
        return row
      })
      .rows()

    expect(results.length).toEqual(2)
    expect(results[0]).toEqual({name: 'Joe'})
    expect(results[1]).toEqual({name: 'Mike'})
  }),
])
