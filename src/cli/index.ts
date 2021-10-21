
import inquirer = require('inquirer')
import chalk from 'chalk'
import { existsSync, statSync } from 'fs'
import { withCSV } from '..'
import { assert } from 'console'

const operations = ['FILTER' , 'DEDUP' , 'KEYS' , 'VIEW' , 'OUTPUT'] as const
type Operation = typeof operations[number]

const MAX_EXEMPLES = 3

async function getFilename() {
  const [_, __, filenameFromArg] = process.argv

  if (filenameFromArg) {
    return filenameFromArg
  }

  const {filenameFromPrompt} = await inquirer.prompt<{filenameFromPrompt: string}>([{
    name: 'filenameFromPrompt',
    type: 'input',
    message: '📄 Please input filename',
    default: './myfile.csv'
  }])

  return filenameFromPrompt
}

function humanSize(filename: string): string {
  const KB = 1024
  const MB = 1024 * 1024

  const {size} = statSync(filename)

  if (size < KB) {
    return `${size}B`
  }

  if (size < MB) {
    return `${size / KB}K`
  }

  return `${size / MB}M`
}

async function main() {
  const filename = await getFilename()
  if (!existsSync(filename)) {
    console.log(chalk.red(`Unknown file : ${chalk.yellow(filename)}`))
    return
  }

  const instance = withCSV(filename)

  const headers = await instance.getHeaders()
  const operations: string[] = []

  console.log(`${chalk.yellow(filename)}${(humanSize(filename))}`)
  
  for (;;) {
    const {operation} = await inquirer.prompt<{operation: Operation}>([{
      message: 'Choose an operation :',
      name: 'operation',
      type: 'checkbox',
      choices: operations
    }])

    switch(operation) {
      case 'FILTER': {
        const {columns} = await inquirer.prompt<{columns: string[]}>([{
          message: 'Choose the columns to filter :',
          name: 'columns',
          type: 'checkbox',
          choices: headers,
          loop: true,
        }])

        for (const column of columns) {
          const someExamples: string[] = []
          await instance.query([column]).some(({[column]: columnValue}) => {
            someExamples.push(columnValue)
            if (someExamples.length > MAX_EXEMPLES) {
              return true
            }
            return false
          })

          for (;;) {
            const {value} = await inquirer.prompt<{value: string}>([{
              message: `Select value to filter on column ${column} (${someExamples.map(example => chalk.green(example)).join(' , ')})`,
              type: 'input',
              name: 'value',
              default: someExamples[0]
            }])
  
            const {doTest} = await inquirer.prompt<{doTest: boolean}>([{
              message: 'Do you want to test this filter ?',
              type: 'confirm',
              name: 'doTest',
              default: false,
            }])
  
            let confirm
            if (doTest) {
              const hits = await instance.query([column]).filter(({[column]: columnValue}) => columnValue === value).count()


              const res = await inquirer.prompt<{confirm: boolean}>([{
                message: hits && hits > 0
                  ? `${chalk.green(hits + ' rows found')} Do you confirm ?`
                  : '0 rows found, are you sure you want to add this filter ?',
                type: 'confirm',
                name: 'confirm',
                default: false,
              }])
            }
          }
        }
      }
    }
  }
}

main().catch(e => {
  console.log(chalk.red('An error occurred :'))
  console.log(e)
})