export class FlowControlSignal {
  label: string

  constructor(label: string) {
    this.label = label
  }
}

export class RowExit extends FlowControlSignal {
  constructor() {
    super('The row was filtered out before the end of the pipeline')
  }
}

export class DuplicateExit extends FlowControlSignal {
  constructor() {
    super('The row was filtered out for being a duplicate')
  }
}

export class PipelineContinue extends FlowControlSignal {
  constructor() {
    super('The row has not stopped the pipeline')
  }
}
