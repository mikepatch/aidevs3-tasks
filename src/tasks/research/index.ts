import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { OpenaiService } from "../../services/OpenaiService";
import { TasksService } from "../../services/TasksService";
import { logAnswerResponse } from "../../utils";

type VerificationItem = {
  id: string;
  value: string;
};

type VerificationResult = {
  id: string;
  isValid: string;
};

const tasksProvider = new TasksService();
const openaiProvider = new OpenaiService();

const verifySingleData = async (data: string): Promise<string> => {
  const verifyDataResponse = (await openaiProvider.getCompletion({
    model: "ft:gpt-4o-mini-2024-07-18:personal::Ajy7le2W",
    messages: [
      {
        role: "system",
        content:
          "You are a data validator. Respond with '1' for valid data and '0' for invalid data.",
      },
      {
        role: "user",
        content: data,
      },
    ],
  })) as OpenAI.ChatCompletion;

  const result = verifyDataResponse.choices[0].message.content;

  if (!result) {
    throw new Error("Error during verifying single data");
  }

  return result;
};

const getData = async () => {
  try {
    return await fs.readFile(
      path.join(__dirname, "data", "verify.txt"),
      "utf-8"
    );
  } catch (error) {
    console.error("Failed to read file:", error);
    throw new Error("Failed to read verify.txt file");
  }
};

const extractData = (data: string) => {
  return data
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, value] = line.split("=");
      return {
        id,
        value,
      };
    });
};

const getResults = async (
  data: VerificationItem[]
): Promise<VerificationResult[]> => {
  try {
    return await Promise.all(
      data.map(async (item) => ({
        id: item.id,
        isValid: await verifySingleData(item.value),
      }))
    );
  } catch (error) {
    console.error("Failed to get results:", error);
    throw new Error("Failed to get verification results");
  }
};

const main = async () => {
  try {
    const dataToVerify = await getData();
    const extractedData = extractData(dataToVerify);
    const verificationResults = await getResults(extractedData);
    const validData = verificationResults
      .filter((item) => item.isValid === "1")
      .map((item) => item.id);

    const answerResponse = await tasksProvider.sendAnswer(
      "research",
      validData
    );
    logAnswerResponse(answerResponse);
  } catch (error) {
    console.error("Task failed:", error);
    process.exit(1);
  }
};

main();
