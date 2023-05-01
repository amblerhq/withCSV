export class FlowControlSignal extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, FlowControlSignal.prototype)
  }
}

export class PipelineExit extends FlowControlSignal {
  constructor() {
    super('The item was filtered out before the end of the pipeline')
  }
}

export class DuplicateExit extends FlowControlSignal {
  constructor() {
    super('The item was filtered out for being a duplicate')
  }
}

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
