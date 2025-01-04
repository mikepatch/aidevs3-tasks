import chalk from "chalk";

type LogType = "info" | "success" | "error" | "warning" | "process";

type LogMessage = {
  type: LogType;
  title: string;
  message?: string;
  details?: Record<string, any>;
};

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

export const logMessage = ({ type, title, message, details }: LogMessage) => {
  const styles = {
    info: { symbol: "ℹ️", color: chalk.blue },
    success: { symbol: "✅", color: chalk.green },
    error: { symbol: "❌", color: chalk.red },
    warning: { symbol: "⚠️", color: chalk.yellow },
    process: { symbol: "🔄", color: chalk.cyan },
  };

  const { symbol, color } = styles[type];

  console.log(chalk.gray("─".repeat(50)));
  console.log(`${symbol} ${color.bold(title)}`);

  if (message) {
    console.log(color(message));
  }

  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      console.log(`${chalk.gray(key)}: ${color(value)}`);
    });
  }

  console.log(chalk.gray("─".repeat(50)) + "\n");
};
