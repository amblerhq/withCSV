import { benchmark, execute } from '..'

execute('Filter operations', [
  benchmark('filter on single condition', async withCSVInstance => {
    await withCSVInstance.filter(row => row['City']!.startsWith('A')).process()
  }),

  benchmark('filter + map pipeline', async withCSVInstance => {
    await withCSVInstance
      .filter(row => row['City']!.startsWith('A'))
      .map(row => ({
        fullName: `${row['First Name']} ${row['Last Name']}`,
        city: row['City'],
      }))
      .rows()
  }),
])
