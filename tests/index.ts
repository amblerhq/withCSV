import chalk from 'chalk'
import { JestAssertionError } from 'expect'
import ora, { Ora } from 'ora'
import { performance } from 'perf_hooks'
import { withCSV } from '../src'
import { WithCSVInstance } from '../src/utils/types'

export const it = (message: string, callback: () => Promise<void>) => {
  return {
    message,
    callback,
    isBenchmark: false,
  }
}

const sizes = ['small', 'medium', 'large'] as const
const columns = ['First Name', 'Last Name', 'Phone', 'City', 'Description'] as const

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export const benchmark = (
  message: string,
  callback: (
    withCSVInstance: WithCSVInstance<Record<(typeof columns)[number], string | undefined>>,
    filePath: string,
  ) => Promise<void>,
) => {
  return {
    message,
    callback: async () => {
      const spinner = ora({ indent: 2 }).start(message)

      const results = await Promise.all(
        sizes.map(async (size) => {
          const filePath = `tests/fixtures/${size}.csv`
          const instance = withCSV(filePath).columns(columns)

          const start = performance.now()
          await callback(instance, filePath)
          const elapsed = performance.now() - start

          return { size, elapsed }
        }),
      )

      const summary = results.map((r) => `${r.size} ${chalk.yellow(formatDuration(r.elapsed))}`).join('  ')
      spinner.succeed(`${message}  ${summary}`)
    },
    isBenchmark: true,
  }
}

export async function execute(suiteMessage: string, testSuite: ReturnType<typeof it>[]) {
  let success = 0
  let failure = 0

  console.log('--------========########========--------')
  console.log()
  console.log(`🧪 ${chalk.blue(suiteMessage)}`)
  console.log()

  for (let test of testSuite) {
    const { message, callback, isBenchmark } = test

    let testSpinner: Ora | null = null

    if (!isBenchmark) {
      testSpinner = ora({ indent: 2 }).start(message)
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
    process.exitCode = 1
  }
  console.log()
}
