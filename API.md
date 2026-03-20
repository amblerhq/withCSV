# with-csv API Documentation

## Initialization

First you need to open a pointer to the CSV data and optionally configure the CSV parser and error management. Then you choose an entry point : `columns` to select specific columns, or `validate` to transform and validate each row.

```typescript
await withCSV("my_data.csv", {
  csv: { separator: "	" },
  errors: "throw-late"
})
.columns(["id", "name", "age"])
```

**withCSV**(csvSource, options):

- **csvSource**: The path to the CSV file, a Buffer, or a ReadStream
- **options** (optional)
  - **options.csv** (optional) : A [csv-parse options object](https://github.com/mafintosh/csv-parser#options)
  - **options.errors** (optional) : how to handle one of the callbacks throwing an error (see **Error Management** below). Defaults to `throw-late`

Valid values for **options.errors** are :

* **ignore**      : continue reading CSV rows until the end of the file
* **throw-early** : throw on the first error caught, wrapped in a `CSVError`
* **throw-late**  : continue reading CSV rows and throw a `CSVError` at the end of the file containing all accumulated errors

## Entry points

**columns(columnNames)**: Takes an array of column names to select from the CSV. This tells TypeScript how to type your rows. The output rows will only contain the specified columns.

```typescript
await withCSV('data.csv')
  .columns(['id', 'name', 'age'])
  // row is typed as { id: string, name: string, age: string }
```

**validate(validator)**: Takes a function that receives each raw row and returns a transformed, validated version. Use this with any validation library (yup, zod, joi) or a hand-rolled validator. The callback's return type determines the pipeline's type going forward.

```typescript
await withCSV('data.csv')
  .validate(row => {
    const r = row as Record<string, string>
    return {
      id: parseInt(r.id),
      name: r.name,
      balance: parseFloat(r.balance),
    }
  })
  // row is now typed as { id: number, name: string, balance: number }
```

## Querying API

Once you have selected an entry point, you can manipulate your CSV data using the Querying API. It consists of two categories of methods :

⛓️ chainable methods which are stacked in a pipeline through which every row will be processed one by one

🚧 terminator methods which will trigger the reading of the file, and the processing of each row through the pipeline

**Only one terminator method can be present.** It will return a promise which resolves to the output of your pipeline.

Unless otherwise specified, the methods signature are always the same as their [corresponding method in the javascript Array prototype](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array).

The only major differences are :

- All methods in the querying API accept **asynchronous callbacks**
- Array methods such as `filter`, `map` etc... will not receive the whole array as their last argument. This is by design as the CSV file is never held fully in memory.

### ⛓️ Chainable methods

**map(callback)**: maps each record to a new shape. The output will be typed accordingly.

**pick(keys)**: picks a subset of properties from the records. `keys` can be a single property name or an array of property names.

**filter(callback)**: filters out records.

**forEach(callback)**: this is executed on each record, but doesn't alter the data of the rows.

**uniq(iterator)**: deduplicates records from your CSV file. It can accept as argument :

* A column name to deduplicate on that column
* An array of column names to deduplicate on the combination of those columns
* A callback returning a value to deduplicate on

### 🚧 Terminator methods

_The following methods only ever consume one row at a time so they are safe to use on very large files_

**process()**: Executes the pipeline on all the rows, but without outputting any data. This is useful for example when your pipeline is based on `forEach` and you want to discard the final output data.

**find(callback)**: returns the first matching record, or `null` if none match. Stops reading as soon as a match is found.

**findIndex(callback)**: returns the index of the first matching record, or `-1` if none match.

**every(callback)**: returns `true` if all records match, `false` as soon as one doesn't.

**some(callback)**: returns `true` as soon as a record matches, `false` if none do.

**includes(value)**: returns `true` if the pipeline output contains a record deeply equal to the given value.

**count()**: returns the number of rows at the end of the pipeline.

**first(limit)**: returns the first elements of the result up to a maximum of `limit` (defaults to 1).

**toCSVFile(csvTarget, options)**: writes the result to a CSV file or a stream
  * if `csvTarget` is a string, a file at this path will be created
  * if `csvTarget` is a WriteStream, the data will be piped directly to it
  * `options` are documented in the [`csv-stringify` documentation page](https://csv.js.org/stringify/options/)

**toJSONFile(jsonTarget, stringifier)**: writes the result to a JSON file as an array
  * if `jsonTarget` is a string, a file at this path will be created
  * if `jsonTarget` is a WriteStream, the data will be piped directly to it
  * `stringifier` is an optional function `(row) => string` to customize JSON serialization (defaults to pretty-printed `JSON.stringify`)

_The following methods will store their result in memory. Very large files should be adequately filtered beforehand._

**rows()**: returns all the rows of the result, as an array of objects.

**last(limit)**: returns the last elements of the result up to a maximum of `limit`.

**skip(offset)**: returns the whole result but omits the `offset` first items.

**key(property, filterUndefined)**: returns an array of the values of that `property` for each row. If `filterUndefined` is true, then only defined values will be returned.

## Error Management

When `options.errors` is set to `throw-early` or `throw-late`, a `CSVError` is thrown.

```typescript
import { CSVError } from 'with-csv/build/utils/errors'
```

The `CSVError` instance exposes :

* **rows**: an array of `RowError` objects, each containing :
  * **idx**: the 1-based row index in the CSV file
  * **error**: the original `Error` object thrown by the callback
  * **message**: the error message string
* **results**: (throw-late only) the accumulated results from all rows that didn't error
