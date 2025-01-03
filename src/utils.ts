import chalk from "chalk";

type AnswerResponse = {
  code: number;
  message: string;
};

export const logAnswerResponse = (response: AnswerResponse) => {
  const isSuccess = response.code === 0;
  const statusSymbol = isSuccess ? "✅" : "❌";
  const statusColor = isSuccess ? chalk.green : chalk.red;

  console.log("\n" + chalk.gray("─".repeat(50))); // Separator line
  console.log(
    `${statusSymbol} Status: ${statusColor.bold(
      isSuccess ? "SUCCESS" : "ERROR"
    )}`
  );

  console.log(chalk.yellow("Code: ") + statusColor(response.code));

  console.log(chalk.yellow("Message: ") + statusColor(response.message));
  console.log(chalk.gray("─".repeat(50)) + "\n"); // Bottom separator
};
