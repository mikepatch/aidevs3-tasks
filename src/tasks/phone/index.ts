import {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/index.mjs";
import { OpenaiService } from "../../services/OpenaiService";
import { TasksService } from "../../services/TasksService";
import fs from "fs/promises";
import path from "path";
import { fixPhoneLogs } from "./tools/agentTools";

const openaiProvider = new OpenaiService();
const tasksProvider = new TasksService();

const saveToFile = async (data: string, path: string) => {
  try {
    await fs.writeFile(path, data, "utf-8");
    console.log(`Success! File saved in: ${path}`);
  } catch (error) {
    console.error("Error! File not saved.", error);
  }
};

const main = async () => {
  const questions = await tasksProvider.getData("phone_questions.json");
  console.log(questions);
  // const conversations = await tasksProvider.getData("phone.json");
  // const conversationsPath = path.join(__dirname, "", "phone-logs.txt");
  // const rebuiltConversationsPath = path.join(
  //   __dirname,
  //   "",
  //   "rebuilt-phone-logs.txt",
  // );
  // const conversationsToRebuild = await fs.readFile(conversationsPath, "utf-8");
  // const rebuiltConversations = await fixPhoneLogs(conversationsToRebuild);
  //
  // // await saveToFile(JSON.stringify(conversations, null, 2), conversationsPath);
  // await saveToFile(
  //   JSON.stringify(rebuiltConversations, null, 2),
  //   rebuiltConversationsPath,
  // );
};

main();
