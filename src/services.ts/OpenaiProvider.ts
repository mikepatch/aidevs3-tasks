import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import OpenAI, { toFile } from "openai";
import { createByModelName } from "@microsoft/tiktokenizer";
import { ImageConfig } from "./types";

export class OpenaiProvider {
  private openai: OpenAI;
  private tokenizers: Map<
    string,
    Awaited<ReturnType<typeof createByModelName>>
  > = new Map();
  private readonly IM_START = "<|im_start|>";
  private readonly IM_END = "<|im_end|>";
  private readonly IM_SEP = "<|im_sep|>";

  constructor() {
    this.openai = new OpenAI();
  }

  async getCompletion(config: {
    messages: ChatCompletionMessageParam[];
    model?: OpenAI.ChatModel;
    stream?: boolean;
    jsonMode?: boolean;
    maxTokens?: number;
  }): Promise<
    | OpenAI.Chat.Completions.ChatCompletion
    | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  > {
    const {
      messages,
      model = "gpt-4o",
      stream = false,
      jsonMode = false,
      maxTokens = 4096,
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
    model?: OpenAI.ChatModel;
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

  async transcribe(audioBuffer: Buffer): Promise<string> {
    console.log("Transcribing audio...");

    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, "speech.mp3"),
      language: "en",
      model: "whisper-1",
    });
    return transcription.text;
  }

  async imageGeneration({
    prompt,
    model = "dall-e-3",
    size = "1024x1024",
  }: ImageConfig): Promise<OpenAI.Images.ImagesResponse> {
    const result = this.openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
    });

    return result;
  }

  async countTokens(
    messages: ChatCompletionMessageParam[],
    model: string = "gpt-4o"
  ): Promise<number> {
    const tokenizer = await this.getTokenizer(model);

    let formattedContent = "";
    messages.forEach((message) => {
      formattedContent += `${this.IM_START}${message.role}${this.IM_SEP}${
        message.content || ""
      }${this.IM_END}`;
    });
    formattedContent += `${this.IM_START}assistant${this.IM_SEP}`;

    const tokens = tokenizer.encode(formattedContent, [
      this.IM_START,
      this.IM_END,
      this.IM_SEP,
    ]);
    return tokens.length;
  }

  async calculateImageTokens(
    width: number,
    height: number,
    detail: "low" | "high"
  ): Promise<number> {
    let tokenCost = 0;

    if (detail === "low") {
      tokenCost += 85;
      return tokenCost;
    }

    const MAX_DIMENSION = 2048;
    const SCALE_SIZE = 768;

    // Resize to fit within MAX_DIMENSION x MAX_DIMENSION
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const aspectRatio = width / height;
      if (aspectRatio > 1) {
        width = MAX_DIMENSION;
        height = Math.round(MAX_DIMENSION / aspectRatio);
      } else {
        height = MAX_DIMENSION;
        width = Math.round(MAX_DIMENSION * aspectRatio);
      }
    }

    // Scale the shortest side to SCALE_SIZE
    if (width >= height && height > SCALE_SIZE) {
      width = Math.round((SCALE_SIZE / height) * width);
      height = SCALE_SIZE;
    } else if (height > width && width > SCALE_SIZE) {
      height = Math.round((SCALE_SIZE / width) * height);
      width = SCALE_SIZE;
    }

    // Calculate the number of 512px squares
    const numSquares = Math.ceil(width / 512) * Math.ceil(height / 512);

    // Calculate the token cost
    tokenCost += numSquares * 170 + 85;

    return tokenCost;
  }

  private async getTokenizer(modelName: string) {
    if (!this.tokenizers.has(modelName)) {
      const specialTokens: ReadonlyMap<string, number> = new Map([
        [this.IM_START, 100264],
        [this.IM_END, 100265],
        [this.IM_SEP, 100266],
      ]);
      const tokenizer = await createByModelName(modelName, specialTokens);
      this.tokenizers.set(modelName, tokenizer);
    }
    return this.tokenizers.get(modelName)!;
  }
}
