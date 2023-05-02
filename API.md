### Initialization

**withCSV**(csvFile, options): Returns an instance of withCSV configured with the provided CSV file and options. At this stage _the CSV file is not opened yet_.

- **csvSource**: The path to the CSV file
- **options** (optional): A [csv-parse options object](https://github.com/mafintosh/csv-parser#options)

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

**pick(keys)**: picks a subset of properties from the records. `keys` is described in the [lodash.pick](https://lodash.com/docs/#pick) documentation.

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

**count()**: returns the number of rows at the end of the pipeline

**first(limit)**: returns the first elements of the result up to a maximum of `limit`

**toCSV(csvTarget, options)**: writes the result to a file or a stream
  * if `csvTarget` is a string, a file at this path will be created
  * if `csvTarget` is a WriteStream, the data will be piped directly to it
  * `options` are documented in the [`csv-stringify` documentation page](https://csv.js.org/stringify/options/)

_The following methods consume the entirety of your CSV file and the resulting output will be stored in memory. Very large files should be adequately filtered beforehand or you may max out your machine's memory._

**last(limit)**: returns the last elements of the result up to a maximum of `limit`

**skip(offset)**: returns the whole result but omits the `offset` first items

**key(property, filterUndefined)**: returns an array of the values of that `property` for each row. If `filterUnderfined` is true, then only defined values will be returned.

**toJSON**(replacer, spaces): returns the final result of the query pipeline, as a JSON string. `replacer` and `spaces` are documented in the [JSON.stringify signature](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

**rows**(): returns all the rows of the result, as an array of objects
