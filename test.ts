import {withCSV} from './src'

async function main() {
  const test = await withCSV('./small.csv')
    .columns(['City'])
    .filter(() => {
      return true
    })
    .rows()

  console.log(test)
}

main().catch(e => {
  console.error(e)
})
