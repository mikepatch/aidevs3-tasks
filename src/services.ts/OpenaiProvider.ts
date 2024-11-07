import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import OpenAI from "openai";

class OpenaiProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async getCompletion(config: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    stream?: boolean;
    jsonMode?: boolean;
    maxTokens?: number;
  }): Promise<
    | OpenAI.Chat.Completions.ChatCompletion
    | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  > {
    const {
      messages,
      model = "gpt-4",
      stream = false,
      jsonMode = false,
      maxTokens = 1024,
    } = config;
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        stream,
        max_tokens: maxTokens,
        response_format: jsonMode ? { type: "json_object" } : { type: "text" },
      });

      if (stream) {
        return chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      } else {
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      }
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  async getContinuousCompletion(config: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    maxTokens?: number;
  }): Promise<string> {
    let { messages, model = "gpt-4o", maxTokens = 1024 } = config;
    let fullResponse = "";
    let isCompleted = false;

    while (!isCompleted) {
      const completion = (await this.getCompletion({
        messages,
        model,
        maxTokens,
      })) as OpenAI.Chat.Completions.ChatCompletion;

      const choice = completion.choices[0];
      fullResponse += choice.message.content || "";

      if (choice.finish_reason !== "length") {
        isCompleted = true;
      } else {
        console.log("Continuing completion...");
        messages = [
          ...messages,
          { role: "assistant", content: choice.message.content },
          {
            role: "user",
            content:
              "[system: Please continue your response to the user's question and finish when you're done from the very next character you were about to write, because you didn't finish your response last time. At the end, your response will be concatenated with the last completion.]",
          },
        ];
      }
    }

    return fullResponse;
  }
}

export default new OpenaiProvider();
