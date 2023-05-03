# with-csv

> _It's like lodash for CSV files !_

☕ Typescript sugar that makes working with CSV files as clean and satisfying as it should always have been. It is crazy fast too, as it is just a lightweight wrapper around battle-tested [parsing](https://www.npmjs.com/package/csv-parser) and [stringifying](https://csv.js.org/stringify/api) libraries.

💅 A fluent API à la lodash, designed to feel like you are working with a plain array of objects. It is fully-typed from end to end and accepts asynchronous callbacks, making it great for database imports and other automation jobs.

🧠 Memory efficient by default : the stream based architecture only ever holds one CSV row in memory at a time, making it possible to work on arbitrarily large files in memory-constrained environments.

## Installing

```bash
npm install with-csv
# or
yarn add with-csv
```

## Usage examples

📜 For detailed usage see the [Full API documentation](API.md)

Given the following CSV file : 

```csv
id,name,phone,flag,category
1,Joe,0612345678,true,6
2,Jack,0698765421,true,12
3,Mark,0645631256,true,54
4,Valerie,0645631256,false,12
```

```typescript
import { withCSV } from 'with-csv'

const result = await withCSV('my.csv')
  .columns(['name', 'phone', 'flag'])
  .filter(row => row.flag === 'true')
  .map(row => `${row.name}: ${row.phone}`)
  .filter(value => value.startsWith('J'))
  .rows()

console.log(result)
// [
//   "Joe: 0612345678",
//   "Jack: 0698765421"
// ]
```

### Database imports

```typescript
const count = await withCSV('user_referrals.csv')
  .columns(['referrer_email', 'referree_email', 'signed_up'])
  .map(row => ({
    referrerEmail: row['referrer_email'],
    referreeEmail: row['referree_email'],
    signedUp: row['signed_up'] === 'true',
  }))
  .filter(row => row.signedUp)
  .forEach(async row => {
    await saveReferral({referrer: row.referrerEmail, referree: row.referreeEmail})
  })
  .count()

await incrementReferralCounter(count)
```

### Outputting to file

```typescript
// Filter a large file and output to another file
await withCSV('logs_latest.csv')
  .columns(['level', 'timestamp', 'message'])
  .filter(row => row.level === 'ERROR')
  .toCSVFile('errors.csv')

// Or output as JSON
await withCSV('logs_latest.csv')
  .columns(['level', 'timestamp', 'message'])
  .filter(row => row.level === 'ERROR')
  .toJSONFile('errors.json')
```

### Error management

You can configure how `with-csv` behaves when one of your callbacks throws an error.

Given the following CSV (we're interested in row 3 which has a negative value):

```csv
id,type,timestamp,flag,value
1,measurement,1111111111,true,6
2,measurement,1111111111,true,12
3,input,1111111111,true,-1
4,measurement,1111111111,false,12
```

```typescript
// throw-early will stop reading the file and throw on the first error 
try {
  await withCSV('datapoints.csv', {errors: 'throw-early'})
    .columns(['type', 'timestamp', 'value'])
    .forEach(row => assert(row.value > 0))
    .toCSVFile('never.csv')
    // Note that the CSV file will never be written
} catch (e) {
  if (e instanceof Error) {
    console.log("Can't process the input file : " + e.message)
  }
}

```

```typescript
// throw-late will continue reading rows from the CSV file, ignoring those that throw.
// An error will be thrown at the end of the file, exposing all the accumulated errors
try {
  await withCSV('datapoints.csv', {errors: 'throw-late'})
    .columns(['type', 'timestamp', 'value'])
    .forEach(row => assert(row.value > 0))
    .toCSVFile('valid_datapoints.csv')
    // Here the CSV file will only contain those rows that haven't caused errors
} catch (e) {
  if (e instanceof CSVError) {
    console.log("The following lines have issues :")

    e.errors.forEach(line => {
      console.log(line.idx + " : " + line.error)
    })
  }
}

```

```typescript
// ignore will continue reading rows from the CSV file, ignoring those that throw.
// After finishing the file it will not throw an error.
await withCSV('datapoints.csv', {errors: 'ignore'})
  .columns(['type', 'timestamp', 'value'])
  .forEach(row => assert(row.value > 0))
  .forEach(async (row) => {
    await saveInDatabase(row)
  })
  .process()
```

## Contributing & Testing

Feel free to write us about any [bug you may find](https://github.com/amblerhq/withCSV/issues), or [submit a PR](https://github.com/amblerhq/withCSV/pulls) if you have fresh ideas for the library !

You can run the tests with `yarn test` and the benchmarks with `yarn benchmark` (this will generate ~250MB of fixtures).

Here are the benchmark results on a decently powerful machine. Small sample contains 100 rows, medium contains 100 000 and large contains 2 000 000.

```
Benchmark Import and export : small: 12.515ms
Benchmark Import and export : medium: 390.564ms
Benchmark Import and export : large: 8.820s
1 => Import and export
Benchmark 1 map : small: 3.122s
Benchmark 1 map : medium: 576.674ms
Benchmark 1 map : large: 9.265s
2 => 1 map
Benchmark 4 chained map : small: 2.094ms
Benchmark 4 chained map : medium: 509.942ms
Benchmark 4 chained map : large: 11.925s
3 => 4 chained map
Benchmark uniq : small: 2.786ms
Benchmark uniq : medium: 667.513ms
Benchmark uniq : large: 15.352s
4 => uniq
```

Made with 💖 @ [Ambler HQ](https://github.com/amblerhq)
