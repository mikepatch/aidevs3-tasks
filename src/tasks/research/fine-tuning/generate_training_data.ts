import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Read data from files
const correctData = readFileSync(
  join(__dirname, "../data/correct.txt"),
  "utf-8"
);
const incorrectData = readFileSync(
  join(__dirname, "../data/incorrect.txt"),
  "utf-8"
);

// Convert data to arrays of lines
const correctLines = correctData.split("\n").filter((line) => line.trim());
const incorrectLines = incorrectData.split("\n").filter((line) => line.trim());

type TrainingData = {
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
}[];

const trainingData: TrainingData = [];

// Add correct data (completion: "1")
correctLines.forEach((line) => {
  trainingData.push({
    messages: [
      {
        role: "system",
        content:
          "You are a data validator. Respond with '1' for valid data and '0' for invalid data.",
      },
      { role: "user", content: line },
      { role: "assistant", content: "1" },
    ],
  });
});

// Add incorrect data (completion: "0")
incorrectLines.forEach((line) => {
  trainingData.push({
    messages: [
      {
        role: "system",
        content:
          "You are a data validator. Respond with '1' for valid data and '0' for invalid data.",
      },
      { role: "user", content: line },
      { role: "assistant", content: "0" },
    ],
  });
});

// Shuffle data
trainingData.sort(() => Math.random() - 0.5);

// Save to JSONL file
const jsonlContent = trainingData
  .map((item) => JSON.stringify(item))
  .join("\n");

writeFileSync(join(__dirname, "training_data.jsonl"), jsonlContent);

console.log("Generated training_data.jsonl");
console.log(`Number of training examples: ${trainingData.length}`);
