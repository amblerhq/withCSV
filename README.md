# withCSV

> _It's like lodash for CSV files !_

`withCSV` is a Node.js library to consume CSV files with clean and readable code, without sacrificing performance. It features :

📜 A fluent API similar to lodash chainable methods, treating your CSV like the array of objects it really is

🏋️ Based on a [robust parsing library using Node streams](https://www.npmjs.com/package/csv-parser). It is stupid fast and memory-efficient by default, for you to go crazy on large files 🪐

🖋️ Barely 300 lines of Typescript

⏳ Support for asynchronous callbacks

## Installing

`withCSV` can be installed using your package manager of choice :

```bash
npm install with-csv
# or
yarn add with-csv
```

## Usage

### Example

Given the following CSV file : 

```csv
id,name,phone,flag,category
1,Joe,0612345678,true,6
2,Jack,0698765421,false,12
3,Mark,0645631256,true,54
4,Valerie,0645631256,true,12
```

```typescript
import { withCSV } from 'with-csv'

const result = await withCSV('my.csv')
  .columns(['name', 'phone', 'flag'])
  // row (below) is automatically typed as {name: string, phone: string, flag: string}
  .filter(row => row.flag === 'true')
  .map(row => `${row.name}: ${row.phone}`)
  // value (below) has been typed as the output of .map , which is a string
  .filter(value => value.startsWith('J'))
  // At this point the CSV file hasn't yet been read
  // It will be read by the terminator method `rows` (below)
  .rows()

console.log(result)
// [
//   "Joe: 0612345678",
//   "Jack: 0698765421"
// ]
```

### Initialization

**withCSV**(csvFile, options): Returns an instance of withCSV configured with the provided CSV file and options. At this stage _the CSV file is not opened yet_.

- **csvFile**: The path to the CSV file
- **options** (optional): A [csv-parse options object](https://csv.js.org/parse/options/)

The `withCSV` instance exposes the methods **columns** which takes as input an array of column names. This allows `withCSV` to infer the type of the rows.

### Querying API

Once you have selected your columns, you can start manipulating your CSV data using the Querying API. It consists of two categories of methods :

⛓️ chainable methods which are stacked in a pipeline through which every row will be processed one by one

🚧 terminator methods which will trigger the reading of the file, and the processing of each row through the pipeline

**Only one terminator method can be present.** It will return a promise which resolves to the output of your pipeline.

Unless otherwise specified, the methods signature are always the same as their [corresponding method in the javascript Array prototype](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array).

The only major differences are :

- All methods in the querying API accept **asynchronous callbacks**
- Array methods such as `filter`, `map` etc... will not receive the whole array as their last argument. This is by design as the CSV file is never held fully in memory.

### ⛓️ Chainable methods

**map(callback)**: maps each record to a new shape. The output will be typed accordingly.

**filter(callback)**: filters out records.

**forEach(callback)**: this is executed on each record, but doesn't alter the data of the rows.

**uniq(iterator)**: deduplicates records from your CSV file. It can accept as argument :

* A column name to deduplicate on that column
* An array of column anmes to deduplicate on the combination of those columns
* A callback returning a string to deduplicate on the value of that string

### 🚧 Terminator methods

_The following methods only ever consume one row at a time so they are safe to use on very large files_

**process**: Executes the pipeline on all the rows, but without outputting any data. This is useful for example when your pipeline is based on `forEach` and you want to discard the final output data.

**find(callback)**: returns the first matching record

**findIndex(callback)**: returns the index of the first matching record

**every(callback)**: returns `true` if all records match

**some(callback)**: returns `true` if at least one record matches

**includes(value)**: returns `true` if the final output contains the value passed. This uses [`lodash.isEqual`](https://lodash.com/docs/4.17.15#isEqual) so the value can be a primitive, object, array, etc...

_The following methods consume the entirety of your CSV file and the resulting output will be stored in memory. Very large files should be adequately filtered beforehand or you may max out your machine's memory._

**first(limit)**: returns the first elements of the result up to a maximum of `limit`

**last(limit)**: returns the last elements of the result up to a maximum of `limit`

**skip(offset)**: returns the whole result but omits the `offset` first items

**pick(keys)**: picks a subset of properties from the result. `keys` is described in the [lodash.pick](https://lodash.com/docs/#pick) documentation.

**key(property, filterUndefined)**: returns an array of the values of that `property` for each row. If `filterUnderfined` is true, then only defined values will be returned.

**toJSON**(replacer, spaces): returns the final result of the query pipeline, as a JSON string. `replacer` and `spaces` are documented in the [JSON.stringify signature](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

**rows**(): returns all the rows of the result, as an array of objects

## Contributing

Feel free to write us about any [bug you may find](https://github.com/amblerhq/withCSV/issues), or [submit a PR](https://github.com/amblerhq/withCSV/pulls) if you have some ideas for the library !

Yes, this project does its testing with a [ghetto 40 lines Jest clone](tests/index.ts) 😎

Made with 💖 @ [Ambler HQ](https://github.com/amblerhq)
