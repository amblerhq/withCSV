import {withCSV} from './src'

async function main() {
  const test = await withCSV('./small.csv')
    .columns(['City'])
    .map(row => {
      throw new Error('SIKE')
      return row
    })
    .rows()

  console.log(test)
}

main().catch(e => {
  console.error(e)
})
