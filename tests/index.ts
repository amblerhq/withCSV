import {BError} from 'berror'
import chalk from 'chalk'

export const it = (message: string, callback: () => Promise<void>) => {
  return {
    message,
    callback,
  }
}

export async function execute(label: string, testSuite: ReturnType<typeof it>[]) {
  let i = 0
  let failed = 0
  let success = 0
  console.log('execute')
  console.log(testSuite)
  for await (let test of testSuite) {
    i++
    console.log(test)
    try {
      const {message, callback} = test
      try {
        console.log(message)
        await callback()
        console.log(666)
      } catch (err: any) {
        console.log('err', err)
        throw new BError(message, err)
      }
      success++
    } catch (err: any) {
      console.log('what', err)
      if (err instanceof BError) {
        console.error(chalk.red('Test ' + i + ' failed:', err.message))
      } else {
        console.error(chalk.red('Unknown error in test ' + i + ':', err.message))
        throw err
      }
      failed++
    }
  }

  console.log()
  console.log('Test suite ' + chalk.blue(label) + ' ran with:')
  console.log(chalk.blue(i + ' tests'))
  console.log(chalk.green(success + ' success'))
  console.log(chalk.red(failed + ' failed'))
  console.log()
}
