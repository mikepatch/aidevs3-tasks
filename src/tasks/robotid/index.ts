import OpenAI from "openai";
import { OpenaiService } from "../../services/OpenaiService";
import { TasksService } from "../../services/TasksService";
import axios from "axios";
import path from "path";
import fs from "fs";
import { GENERATE_IMAGE_PROMPT } from "./prompts";

const openai = new OpenaiService();
const tasks = new TasksService();

const saveImage = async (imageUrl: string): Promise<void> => {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "binary");
  const filename = `robot_${Date.now()}.png`;

  fs.writeFileSync(path.join(__dirname, filename), buffer);
  console.log(`Image saved as ${filename}`);
};

(async () => {
  try {
    const { description: robotDescription } = (await tasks.getData(
      "robotid.json"
    )) as {
      description: string;
    };

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: GENERATE_IMAGE_PROMPT,
      },
      { role: "user", content: robotDescription },
    ];
    const completionResponse = (await openai.getCompletion({
      messages,
      model: "gpt-4o",
      maxTokens: 1024,
    })) as OpenAI.ChatCompletion;

    const preparedPrompt = completionResponse.choices[0].message.content;
    if (!preparedPrompt) throw new Error("Prompt generation failed");

    const imageResponse = (await openai.imageGeneration({
      prompt: preparedPrompt,
    })) as OpenAI.ImagesResponse;

    const generatedImgUrl = imageResponse.data[0].url;
    if (!generatedImgUrl) throw new Error("Image generation failed");

    await saveImage(generatedImgUrl);

    const answerResponse = await tasks.sendAnswer("robotid", generatedImgUrl);

    console.log({ robotDescription, preparedPrompt });
    console.log({ generatedImgUrl, answerResponse });
  } catch (error) {
    console.error("An error occurred during execution:", error);
  }
})();
