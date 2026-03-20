import expect from 'expect'
import { execute, it } from '..'
import { deepEqual } from '../../src/utils/deep-equal'
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

  // --- deepEqual ---

  it('deepEqual with identical primitives', async () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('abc', 'abc')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
  }),

  it('deepEqual with different primitives', async () => {
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'b')).toBe(false)
    expect(deepEqual(true, false)).toBe(false)
    expect(deepEqual(0, '')).toBe(false)
  }),

  it('deepEqual with flat objects', async () => {
    expect(deepEqual({ a: '1', b: '2' }, { a: '1', b: '2' })).toBe(true)
    expect(deepEqual({ a: '1', b: '2' }, { a: '1', b: '3' })).toBe(false)
  }),

  it('deepEqual with different key counts', async () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
  }),

  it('deepEqual with nested objects', async () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
  }),

  it('deepEqual with null vs object', async () => {
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual({}, null)).toBe(false)
  }),

  it('deepEqual with arrays', async () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false)
  }),

  it('deepEqual same reference returns true', async () => {
    const obj = { a: 1 }
    expect(deepEqual(obj, obj)).toBe(true)
  }),
])
