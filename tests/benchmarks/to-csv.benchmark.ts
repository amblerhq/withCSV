import {benchmark, execute} from '..'

execute('CSV parser and stringifier', [
  benchmark('Read CSV file and write it back to disk', async (withCSVInstance, filePath) => {
    await withCSVInstance.toCSVFile(`${filePath}.result.csv`)
  }),
])
