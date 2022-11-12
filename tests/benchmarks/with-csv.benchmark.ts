import {benchmark, execute} from '..'
import {withCSV} from '../../src'

const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description'] as const

execute('Basic operation', [
  benchmark('Import and export', async path => {
    await withCSV(path).columns(columns).toCSV(`${path}.result.csv`)
  }),
  benchmark('1 map', async path => {
    await withCSV(path)
      .columns(columns)
      .map(row => ({
        firstName: row['First Name'],
        lastName: row['Last Name'],
        phone: row['Phone'],
        city: row['City'],
        description: row['Description'],
      }))
      .rows()
  }),
  benchmark('4 chained map', async path => {
    await withCSV(path)
      .columns(columns)
      .map(row => ({
        firstName: row['First Name'],
        lastName: row['Last Name'],
        phone: row['Phone'],
        city: row['City'],
        description: row['Description'],
      }))
      .map(row => [[row.lastName], [row.phone, row.city, row.description]])
      .map(([name, ...coords]) => ({
        name,
        coords,
      }))
      .map(row => `${row.name}, ${row.coords.join(' - ')}`)
      .rows()
  }),
  benchmark('uniq', async path => {
    await withCSV(path).columns(columns).uniq('Description').rows()
  }),
])
