export class FlowControlSignal extends Error {
  constructor(message: string) {
    super(message)
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
