import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { error } from "console";
import { OpenaiProvider } from "../../services/OpenaiProvider";
import { TasksProvider } from "../../services/TasksProvider";
import { transcribe } from "./transcribe";

const openaiService = new OpenaiProvider();
const tasksService = new TasksProvider();

(async () => {
  await transcribe();
  const transcriptionsDir = path.join(__dirname, "transcriptions");
  const transcriptionFiles = fs.readdirSync(transcriptionsDir);

  const transcriptionsContent = transcriptionFiles
    .map((file, index) => {
      const content = fs.readFileSync(
        path.join(transcriptionsDir, file),
        "utf-8"
      );

      return `Statement ${index + 1} (${path.parse(file).name}):
      ${content}`;
    })
    .join("\n\n");

  try {
    const chatResponse = (await openaiService.getCompletion({
      messages: [
        {
          role: "system",
          content: `You are a detective analyzing witness statements. First you need to think about what is the name of the Polish university, then check where that university is located. The name of that university is a little tricky in the statements so think about it. Please keep in mind that the statements may be contradictory. Return only the street name`,
        },
        {
          role: "user",
          content: `Here are witness statements about Andrzej Maj and his workplace. Please identify the street name where the Polish university/institute is located and return only that street name and nothing else:\n\n${transcriptionsContent}`,
        },
      ],
    })) as OpenAI.ChatCompletion;
    const result = chatResponse.choices[0].message.content;
    if (!result) throw error;

    console.log(result);

    const answerResponse = await tasksService.sendAnswer("mp3", result);

    console.log(answerResponse);
  } catch (error) {
    throw error;
  }
})();
