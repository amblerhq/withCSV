import inquirer = require('inquirer')
import chalk from 'chalk'
import {existsSync, statSync} from 'fs'
import {withCSV} from '..'
import {assert} from 'console'

const validOperations = ['FILTER', 'DEDUP', 'KEYS', 'VIEW', 'OUTPUT'] as const
type ValidOperation = typeof validOperations[number]

interface Operation {
  type: ValidOperation
  values?: Record<string, string>
}

const MAX_EXEMPLES = 3

async function getFilename() {
  const [_, __, filenameFromArg] = process.argv

  if (filenameFromArg) {
    return filenameFromArg
  }

  const {filenameFromPrompt} = await inquirer.prompt<{filenameFromPrompt: string}>([
    {
      name: 'filenameFromPrompt',
      type: 'input',
      message: '📄 Please input filename',
      default: './myfile.csv',
    },
  ])

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

function displayOperations(operations: Operation[]) {
  for (const operation of operations) {
    switch (operation.type) {
      case 'FILTER': {
        const {values} = operation
        if (values) {
          console.log(
            `${chalk.green(operation.type)} : ${Object.keys(values)
              .map(column => column + ' = ' + values[column])
              .join(' && ')}`,
          )
        }
      }
    }
  }
}

function executeOperations(filename: string, operations: Operation[]) {
  let instance = withCSV(filename).query()

  for (const operation of operations) {
    switch (operation.type) {
      case 'FILTER': {
        const {values} = operation
        if (values) {
          for (const column of Object.keys(values)) {
            const value = values[column]
            instance = instance.filter(row => row[column] === value)
          }
        }
      }
    }
  }
}

async function main() {
  const filename = await getFilename()
  if (!existsSync(filename)) {
    console.log(chalk.red(`Unknown file : ${chalk.yellow(filename)}`))
    return
  }

  const instance = withCSV(filename)

  const headers = await instance.getHeaders()
  const operations: Operation[] = []

  for (;;) {
    console.log(`${chalk.yellow(filename)} (${humanSize(filename)})`)
    if (operations.length > 0) {
      displayOperations(operations)
    }
    const {operation} = await inquirer.prompt<{operation: ValidOperation}>([
      {
        message: 'Choose an operation :',
        name: 'operation',
        type: 'list',
        choices: validOperations,
      },
    ])

    switch (operation) {
      case 'FILTER': {
        const {columns} = await inquirer.prompt<{columns: string[]}>([
          {
            message: 'Choose the columns to filter :',
            name: 'columns',
            type: 'checkbox',
            choices: headers,
            loop: true,
          },
        ])

        const filters: Record<string, string> = {}

        for (const column of columns) {
          const someExamples: string[] = []
          await withCSV(filename)
            .query([column])
            .some(({[column]: columnValue}) => {
              someExamples.push(columnValue)
              if (someExamples.length > MAX_EXEMPLES) {
                return true
              }
              return false
            })

          for (;;) {
            const {value} = await inquirer.prompt<{value: string}>([
              {
                message: `Select value to filter on column ${column} (${someExamples
                  .map(example => chalk.green(example))
                  .join(' , ')})`,
                type: 'input',
                name: 'value',
                default: someExamples[0],
              },
            ])

            const {doTest} = await inquirer.prompt<{doTest: boolean}>([
              {
                message: 'Do you want to test this filter ?',
                type: 'confirm',
                name: 'doTest',
                default: false,
              },
            ])

            let confirm
            if (doTest) {
              const hits = await withCSV(filename)
                .query([column])
                .filter(({[column]: columnValue}) => columnValue === value)
                .count()

              const res = await inquirer.prompt<{confirm: boolean}>([
                {
                  message:
                    hits && hits > 0
                      ? `${chalk.green(hits + ' rows found')} Do you confirm ?`
                      : '0 rows found, are you sure you want to add this filter ?',
                  type: 'confirm',
                  name: 'confirm',
                  default: false,
                },
              ])

              confirm = res.confirm
            }

            if (!doTest || confirm) {
              filters[column] = value
              break
            }
          }
        }
        operations.push({
          type: 'FILTER',
          values: filters,
        })
        break
      }
      case 'VIEW': {
        console.table(await withCSV(filename).get())
      }
    }
  }
}

main().catch(e => {
  console.log(chalk.red('An error occurred :'))
  console.log(e)
})
