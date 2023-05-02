import {benchmark, execute} from '..'

const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description'] as const

execute('To JSON', [
  benchmark('Read and write JSON file', async (withCSVInstance, filePath) => {
    await withCSVInstance.toCSVFile(`${filePath}.result.csv`)
  }),
])
