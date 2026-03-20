# Changelog

## 3.0.0

### Breaking changes

- **`withCSV()` signature**: The second argument is now an options object `{ csv?, errors? }` instead of raw csv-parser options
- **`toCSV()` → `toCSVFile()`**: Renamed for clarity
- **`toJSON()` removed**: Replaced by `toJSONFile()` which writes to a file instead of returning a string
- **Error handling**: Errors are no longer silently swallowed. A new `errors` option controls behavior (`'throw-late'` by default, `'throw-early'`, `'ignore'`)
- **`CSVError.errors` → `CSVError.rows`**: Renamed for clarity
- **`RowError.error`**: Now holds the `Error` object instead of a string. The message is available on `RowError.message`
- **`columns()` return type**: Values are now `string | undefined` instead of `string`, reflecting the reality that a column may be missing from a row
- **Node.js >= 18 required**: Target upgraded to ES2022

### New features

- **`validate()` entry point**: Alternative to `columns()` — accepts any validation/transform function (yup, zod, joi, or hand-rolled), with full type inference on the output
- **`toJSONFile(target, stringifier?)`**: Stream rows to a JSON file with optional custom stringifier
- **Error policies**: `'throw-early'` stops on first error, `'throw-late'` collects all errors and exposes them on `CSVError` along with valid results, `'ignore'` skips errored rows silently
- **`Error.cause`**: `CSVError` now chains the original error(s) via `Error.cause` for better debugging

### Architecture

- **Generator-based traversal**: Replaced throw-based flow control (`RowExit`, `DuplicateExit`, `PipelineContinue`) with async generators and a `SKIP` symbol. `catch` blocks now only handle real errors
- **Fast-path sync pipeline**: `applyPipeline` returns synchronously when no callback returns a Promise, avoiding unnecessary microtask scheduling. ~20-25% faster on typical sync pipelines
- **Backpressure handling**: `toJSONFile` respects stream backpressure (checks `write()` return value, awaits `drain`)
- **Stream lifecycle**: File output methods properly await the `finish` event before resolving

### Improvements

- **Zero lodash dependencies**: Replaced `lodash.pick`, `lodash.isarray`, `lodash.isequal`, `lodash.isfunction`, `lodash.isstring` with native implementations
- **No more hashing**: `uniq` deduplication uses type-prefixed string keys instead of MD5 hashing — zero collision risk, no crypto dependency
- **Native deep equality**: `includes()` uses `node:util` `isDeepStrictEqual` instead of a hand-rolled implementation
- **Modular architecture**: Monolithic `src/index.ts` split into `get-instance`, `traverse`, `apply-pipeline`, `errors`, `types`
- **TypeScript 5**: Upgraded from TypeScript 4.8 to 5.8
- **Tooling**: Switched from yarn to npm
- **Updated dependencies**: csv-parser ^3.2.0, csv-stringify ^6.7.0, @types/node ^22

### Bug fixes

- **`uniq` state leak**: `seen` set is now re-initialized on each traversal, preventing stale deduplication across multiple calls on the same instance
- **`toCSVFile` column order**: Values are written in consistent column order derived from the first row
- **Non-Error rejection handling**: Pipeline errors that aren't `Error` instances are wrapped in `new Error(String(error))` instead of being silently dropped

### Tests

- Added tests for `validate()` (5 tests)
- Added tests for `toJSONFile()` and `toCSVFile()` (5 tests)
- Added tests for `pick` helper (5 tests)
- Updated error tests for new `CSVError` shape
- Benchmark runner overhauled: `performance.now()` measurement, ora spinners, parallel execution per size
- **46 tests total**

### Benchmarks (2M rows, sync pipeline)

| Benchmark | v2 → v3 |
|-----------|---------|
| 1 map | 7.89s |
| 4 chained map | 9.01s |
| filter + map | 6.67s |
| count | 7.20s |
| find (early exit) | 10ms |
