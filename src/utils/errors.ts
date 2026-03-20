export type RowError = {
  idx: number
  error: Error
  message?: string
}

export class CSVError extends Error {
  rows: RowError[]
  results: unknown

  constructor(rows: RowError[], results?: unknown) {
    super('Some errors occurred while processing the CSV')
    Object.setPrototypeOf(this, CSVError.prototype)

    this.rows = rows
    this.results = results
  }
}
