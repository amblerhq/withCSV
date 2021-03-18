# withCSV

> _It's like lodash for CSV files !_

`withCSV` is a Node.js library to consume CSV files with clean and readable code, without sacrificing performance. It features :

📜 A fluent API similar to lodash chainable methods, treating your CSV like the array of objects it really is

🏋️ A [robust parsing library based on Node streams](https://www.npmjs.com/package/csv-parser) which makes it memory-efficient by default, even on very large files

🖋️ Smart typing which makes it a pleasure to work with in Typescript

⏳ Support for asynchronous callbacks

## Getting started

`withCSV` can be installed using your package manager of choice :

```bash
npm install withCSV
# or
yarn add withCSV
```

You can then use it to parse and manipulate CSV files like so :

```typescript
import {withCSV} from 'withCSV'
/*
my.csv contains the following rows :

id,name,phone,flag,category
1,Joe,0612345678,true,6
2,Jack,0698765421,false,12
3,Mark,0645631256,true,54
4,Jonas,0645631256,true,12
*/

withCSV('my.csv')
  .query(['name', 'phone', 'flag'])
  // row (below) is automatically typed as {name: string, phone: string, flag: string}
  .filter(row => row.flag === 'true')
  .map(row => `${row.name}: ${row.phone}`)
  // value (below) has been typed as the output of .map , which is a string
  .filter(value => value.startsWith('J'))
  // At this point the CSV file hasn't yet been read
  // It will be read by the first terminator method, in this case toArray
  .toArray()
  // toArray returns a promise which resolves with the content of the CSV file,
  // as manipulated by the chained methods
  .then(result => {
    console.log(result)
    // > ['Joe: 0612345678', 'Jonas: 0645631256']
  })
  // If any of the methods in the chain has failed, we will get the error here
  .catch(e => {
    console.log('ERROR', e)
  })
```

## Initializing

**withCSV**(csvFile, options): Returns an instance of withCSV configured with the provided CSV file and options. At this stage _the CSV file is not opened yet_.

- **csvFile**: The path to the CSV file
- **options** (optional): A [csv-parse options object](https://csv.js.org/parse/options/)

The `withCSV` instance exposes two methods : **get** and **query**. 

- **get** is used to fetch the whole file in one go, and return it as an array of objects. This can be used when you don't need to filter or manipulate the data, and are certain that it will fit in memory.
- **query** is used for advanced manipulations such as filtering and mapping. It exposes an API modeled on the javascript Array prototype, and processes the CSV file line by line, allowing you to filter data out of very large files.

## Simple usage

**get**(columns)

- **columns**(optional): An array of strings corresponding to the headers of the columns you want to retrieve. If columns is empty, all columns are returned. In this case withCSV cannot infer the column names and you will not benefit from the smart typing features.

```javascript
const records = await withCSV('my.csv').get(['name', 'phone', 'flag'])
  /* [
      { name: "Joe", phone: "0612345678", flag: "true" },
      { name: "Jack", phone: "0698765421", flag: "false" },
      ... (all rows are returned)
    ] */
```

## Querying API

The `query` method also allows you to select columns on your file. The resulting instance exposes the querying API, which can be split in two groups :

⛓️ chainable methods which are stacked in a pipeline through which every row will be processed one by one

🚧 terminator methods which will trigger the reading of the file, and the processing of each row through the pipeline

**Only one terminator method can be present.** It will return a promise which resolves to the output of your pipeline.

Unless otherwise specified, the methods signature are always the same as their [corresponding method in the javascript Array prototype](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array).

The only major differences are :

- All methods in the querying API accept **asynchronous callbacks**
- Array methods such as `filter`, `map` etc... will not receive the whole array as their last argument. This is by design as the CSV file is never held fully in memory.

### ⛓️ Chainable methods

**filter**: filters out records.

**map**: maps each record to a new shape. The output will be automatically typed correctly.

**forEach**: this is executed on each record, but doesn't actually alter the output data.

### 🚧 Terminator methods

**find**: returns the first matching record

**every**: returns `true` if all records match

**some**: returns `true` if at least one record matches

**includes**: returns `true` if the final output contains the value passed. This uses [`lodash.isEqual`](https://lodash.com/docs/4.17.15#isEqual) so the value can be a primitive, object, array, etc...

```javascript
await withCSV('my.csv')
  .query(['phone'])
  .map(row => row.phone)
  .includes('0612345678')
  // true
```

**process**: Executes the pipeline on all the rows, but without outputting any data. This is useful for example when your pipeline is based on `forEach` and you want to discard the final output data.

⚠️ _The following methods consume the entirety of your CSV file and the resulting output will be stored in memory. Very large files should be adequately filtered before being consumed in their entirety._

**toArray**: returns the final result of the query pipeline as a javascript array.

**toJSON**(replacer, spaces): returns the final result of the query pipeline, as a JSON string. `replacer` and `spaces` are documented in the [JSON.stringify signature](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).
### Wait, no reduce ?

There is no significant advantage to implementing a reducer in `withCSV`, but you can use the native `reduce` method on the output of `toArray`. If you need async reduce, then may God and Bluebird have mercy on your soul !

Made with 💖 @ [Ambler HQ](https://github.com/amblerhq)
