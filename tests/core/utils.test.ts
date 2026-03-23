import expect from 'expect'
import { execute, it } from '..'
import { pick } from '../../src/utils/pick'

execute('Utility helpers', [
  // --- pick ---

  it('pick with a single key', async () => {
    expect(pick({ a: 1, b: 2, c: 3 }, 'b')).toEqual({ b: 2 })
  }),

  it('pick with multiple keys', async () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  }),

  it('pick with missing keys returns undefined values', async () => {
    const result = pick({ a: 1 } as Record<string, unknown>, ['a', 'z'])
    expect(result).toEqual({ a: 1, z: undefined })
  }),

  it('pick with empty keys array returns empty object', async () => {
    expect(pick({ a: 1, b: 2 }, [])).toEqual({})
  }),

  it('pick preserves value types', async () => {
    const obj = { str: 'hello', num: 42, bool: true, nil: null }
    expect(pick(obj, ['str', 'num', 'bool', 'nil'])).toEqual(obj)
  }),
])
