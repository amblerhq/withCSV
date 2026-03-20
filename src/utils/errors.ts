export type RowError = {
  idx: number
  error: Error
  message?: string
}

export class CSVError extends Error {
  rows: RowError[]
  results: unknown

  constructor(rows: RowError[], results?: unknown) {
    super(`CSV processing failed with ${rows.length} error(s)`, {
      cause: rows.length === 1 ? rows[0].error : rows.map((r) => r.error),
    })
    Object.setPrototypeOf(this, CSVError.prototype)

    this.rows = rows
    this.results = results
  }
}
