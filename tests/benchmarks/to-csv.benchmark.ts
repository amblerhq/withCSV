import {benchmark, execute} from '..'

const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description'] as const

execute('To CSV', [
  benchmark('Read and write CSV file', async (withCSVInstance, filePath) => {
    await withCSVInstance.toCSVFile(`${filePath}.result.csv`)
  }),
])
