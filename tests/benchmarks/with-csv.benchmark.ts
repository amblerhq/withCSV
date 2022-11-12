import {benchmark, execute} from '..'
import {withCSV} from '../../src'

const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description']

execute('Basic operation', [
  benchmark('Import and export', async path => {
    await withCSV(path).columns(columns).toCSV(`${path}.result.csv`)
  }),
])
