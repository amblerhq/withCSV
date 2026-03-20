import { benchmark, execute } from '..'

execute('Terminator operations', [
  benchmark('count (full traversal, no accumulation)', async withCSVInstance => {
    await withCSVInstance.count()
  }),

  benchmark('find (early exit on first match)', async withCSVInstance => {
    await withCSVInstance.find(row => row['First Name'] === 'John')
  }),

  benchmark('every (full traversal, boolean check)', async withCSVInstance => {
    await withCSVInstance.every(row => row['First Name']!.length > 0)
  }),

  benchmark('some (early exit on first true)', async withCSVInstance => {
    await withCSVInstance.some(row => row['City']!.startsWith('Z'))
  }),
])
