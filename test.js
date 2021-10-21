const {withCSV} = require('./build/index')

async function main() {
  let start = Date.now()
  const deduped1 = await withCSV('./test.csv').query().uniq(({name}) => ({name})).toArray()
  console.log(Date.now() - start)
  start = Date.now()
  const deduped2 = await withCSV('./test.csv').query().uniq(({name, age}) => ({name, age})).toArray()
  console.log(Date.now() - start)
  start = Date.now()
  const deduped3 = await withCSV('./test.csv').query().uniq().toArray()
  console.log(Date.now() - start)
  start = Date.now()


  const deduped4 = await withCSV('./bigtest.csv').query().uniq(row => row['Series_reference']).toArray()
  console.log(Date.now() - start)
  console.log({deduped1, deduped2, deduped3})
}

main().catch(e => console.log(e))