import {benchmark, execute} from '..'

execute('Basic functions', [
  benchmark('1 map', async withCSVInstance => {
    await withCSVInstance
      .map(row => ({
        firstName: row['First Name'],
        lastName: row['Last Name'],
        phone: row['Phone'],
        city: row['City'],
        description: row['Description'],
      }))
      .rows()
  }),
  benchmark('4 chained map', async withCSVInstance => {
    await withCSVInstance
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
  benchmark('uniq', async withCSVInstance => {
    await withCSVInstance.uniq('Description').process()
  }),
])
