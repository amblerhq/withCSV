import chalk from 'chalk'
import {MultiBar, Presets} from 'cli-progress'
import {JestAssertionError} from 'expect'
import ora, {Ora} from 'ora'
import {withCSV} from '../src'
import {WithCSVInstance} from '../src/utils/types'

export const it = (message: string, callback: () => Promise<void>) => {
  return {
    message,
    callback,
    isBenchmark: false,
  }
}

const benchmarks = ['small', 'medium', 'large'] as const
const size: Record<(typeof benchmarks)[number], number> = {
  small: 100,
  medium: 100_000,
  large: 2_000_000,
}
const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description'] as const

export const benchmark = (
  message: string,
  callback: (
    withCSVInstance: WithCSVInstance<Record<(typeof columns)[number], string>>,
    filePath: string,
  ) => Promise<void>,
) => {
  return {
    message,
    callback: async () => {
      const multibar = new MultiBar(
        {
          clearOnComplete: false,
          autopadding: true,
          fps: 5,
          format: '{benchmark} | {duration_formatted} | {bar} | {value}/{total}',
        },
        Presets.rect,
      )

      await Promise.all(
        benchmarks.map(async benchmark => {
          const filePath = `tests/fixtures/${benchmark}.csv`
          const progress = multibar.create(size[benchmark], 0, {benchmark: benchmark.padEnd(6)})

          const withCSVInstance = await withCSV(filePath)
            .columns(columns)
            .forEach(() => {
              progress.increment(1)
            })

          await callback(withCSVInstance, filePath)

          progress.stop()
        }),
      )

      multibar.stop()
    },
    isBenchmark: true,
  }
}

export async function execute(suiteMessage: string, testSuite: ReturnType<typeof it>[]) {
  let i = 0
  let success = 0
  let failure = 0

  console.log('--------========########========--------')
  console.log()
  console.log(`🧪 ${chalk.blue(suiteMessage)}`)
  console.log()

  for (let test of testSuite) {
    i++
    const {message, callback, isBenchmark} = test

    let testSpinner: Ora | null = null

    if (isBenchmark) {
      console.log(chalk.blue(message))
    } else {
      testSpinner = ora({indent: 2}).start(message)
    }

    try {
      await callback()
      testSpinner && testSpinner.succeed()
      success++
    } catch (err: any) {
      testSpinner && testSpinner.fail()
      if (err instanceof JestAssertionError) {
        console.log(err.message)
      } else {
        console.error(err)
      }
      failure++
    }
  }

  console.log()
  console.log(`🎩 ${chalk.green(`${success} OK`)}`)
  if (failure > 0) {
    console.log(`🧐 ${chalk.red(`${failure} KO`)}`)
  }
  console.log()
}

export const inMemoryCSV = (headers: string[], rows: string[][]) => {
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  return Buffer.from(csv)
}
