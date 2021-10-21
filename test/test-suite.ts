import { BError } from "berror";
import chalk from "chalk";

export const it = (message: string, callback: () => Promise<void>) => {
  return {
    message,
    callback,
  };
};

export async function execute(testSuite: ReturnType<typeof it>[]) {
  let i = 0;
  let failed = 0;
  let success = 0;
  for await (let test of testSuite) {
    i++;
    try {
      const { message, callback } = test;
      try {
        await callback();
      } catch (err: any) {
        throw new BError(message, err);
      }
      success++;
    } catch (err: any) {
      if (err instanceof BError) {
        console.error(chalk.red("Test " + i + " failed:", err.message));
      } else {
        console.error(
          chalk.red("Unknown error in test " + i + ":", err.message)
        );
        throw err;
      }
      failed++;
    }
  }

  console.log();
  console.log("Test suite ran with:");
  console.log(chalk.blue(i + " tests"));
  console.log(chalk.green(success + " success"));
  console.log(chalk.red(failed + " failed"));
  console.log();
}
