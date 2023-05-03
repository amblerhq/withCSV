import {benchmark, execute} from '..'

execute('JSON stream stringifier', [
  benchmark('Default (prettified) stringifier', async (withCSVInstance, filePath) => {
    await withCSVInstance.toJSONFile(`${filePath}.result.json`)
  }),
  benchmark('Basic stringifier', async (withCSVInstance, filePath) => {
    await withCSVInstance.toJSONFile(`${filePath}.result.json`, JSON.stringify)
  }),
])
