import {faker} from '@faker-js/faker'
import {stringify} from 'csv-stringify'
import {createWriteStream} from 'fs'

const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description']

export function generateCSV(name: string, length: number) {
  console.time(name)
  const stringifier = stringify({header: true, columns})

  for (let i = 0; i < length; i++) {
    stringifier.write([
      faker.name.firstName(),
      faker.name.lastName(),
      faker.phone.number(),
      faker.address.city(),
      faker.hacker.adjective(),
    ])
  }
  stringifier.end()
  stringifier.pipe(createWriteStream(`./tests/fixtures/${name}.csv`))
  console.timeEnd(name)
}

generateCSV('small', 100)
generateCSV('medium', 100_000)
generateCSV('large', 500_000)
