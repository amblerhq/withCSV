# Changelog

## 3.0.0

### Breaking changes

- **`withCSV()` signature**: The second argument is now an options object `{ csv?, errors? }` instead of raw csv-parser options
- **`toCSV()` → `toCSVFile()`**: Renamed for clarity
- **`toJSON()` removed**: Replaced by `toJSONFile()` which writes to a file instead of returning a string
- **Error handling**: Errors are no longer silently swallowed. A new `errors` option controls behavior (`'throw-late'` by default, `'throw-early'`, `'ignore'`)
- **`CSVError.errors` → `CSVError.rows`**: Renamed for clarity
- **`RowError.error`**: Now holds the `Error` object instead of a string. The message is available on `RowError.message`

### New features

- **`validate()` entry point**: Alternative to `columns()` — accepts any validation/transform function (yup, zod, joi, or hand-rolled), with full type inference on the output
- **`toJSONFile(target, stringifier?)`**: Stream rows to a JSON file with optional custom stringifier
- **Error policies**: `'throw-early'` stops on first error, `'throw-late'` collects all errors and exposes them on `CSVError` along with valid results, `'ignore'` skips errored rows silently

### Improvements

- **Zero lodash dependencies**: Replaced `lodash.pick`, `lodash.isarray`, `lodash.isequal`, `lodash.isfunction`, `lodash.isstring` with native implementations
- **Modular architecture**: Monolithic `src/index.ts` split into `get-instance`, `traverse`, `apply-pipeline`, `flow-control`, `errors`, `types`
- **TypeScript 5**: Upgraded from TypeScript 4.8 to 5.8
- **Bracket spacing**: Lint style updated (`{X}` → `{ X }`)
- **Tooling**: Switched from yarn to npm
- **Updated dependencies**: csv-parser ^3.2.0, csv-stringify ^6.7.0, @types/node ^22

### Tests

- Added tests for `validate()` (5 tests)
- Added tests for `toJSONFile()` and `toCSVFile()` (5 tests)
- Added tests for `pick` and `deepEqual` helpers (13 tests)
- Updated error tests for new `CSVError` shape
- **54 tests total**

### Benchmarks

- Added `filter` benchmarks (single condition, filter + map pipeline)
- Added `terminator` benchmarks (count, find, every, some)
