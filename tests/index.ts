import chalk from 'chalk'

export const it = (message: string, callback: () => Promise<void>) => {
  return {
    message,
    callback,
  }
}

export async function execute(suiteMessage: string, testSuite: ReturnType<typeof it>[]) {
  let i = 0
  let success = 0
  let failure = 0

  console.log()
  console.log(chalk.underline(`Running test suite "${suiteMessage}"`))

  for await (let test of testSuite) {
    i++
    const {message, callback} = test
    try {
      await callback()
      console.log(chalk.green(`${i} => ${message}`))
      success++
    } catch (err: any) {
      console.log()
      console.log(chalk.red(`${i} => ${message}`))
      console.log(chalk.yellow(err.message))
      console.log()
      failure++
    }
  }

  console.log()
  console.log('####')
  if (failure === 0) {
    console.log(`# ${chalk.green(`${success} OK`)}`)
  } else {
    console.log(`# ${chalk.green(`${success} OK`)} - ${chalk.red(`${failure} KO`)}`)
  }
  console.log('####')
}
