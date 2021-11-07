import {writeFileSync} from 'fs'
import {withCSV} from '../../src'

async function convert() {
  writeFileSync('./tests/data/small.json', await withCSV('./tests/data/small.csv').query().toJSON(2))
}

convert().catch(e => {
  console.log(e)
})
