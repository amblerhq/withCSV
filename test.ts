import {withCSV} from './src'

async function main() {
  console.time('csv')
  await withCSV('./tests/fixtures/large.csv')
    .columns(['First Name', 'Last Name', 'Phone', 'City', 'Description'])
    .map(row => ({
      firstName: row['First Name'],
      lastName: row['Last Name'],
      description: row.Description,
    }))
    .toCSVFile('./dump.csv')
  console.timeEnd('csv')

  console.time('json')
  await withCSV('./tests/fixtures/large.csv')
    .columns(['First Name', 'Last Name', 'Phone', 'City', 'Description'])
    .map(row => ({
      firstName: row['First Name'],
      lastName: row['Last Name'],
      description: row.Description,
    }))
    .toJSONFile('./dump.json')
  console.timeEnd('json')
}

main().catch(e => {
  console.error(e)
})
