export type RowError = {
  idx: number
  error: string
}

export class CSVError extends Error {
  errors: RowError[]
  results: unknown

  constructor(errors: RowError[], results: unknown) {
    super('Some errors occurred while processing the CSV')
    Object.setPrototypeOf(this, CSVError.prototype)

    this.errors = errors
    this.results = results
  }
}
