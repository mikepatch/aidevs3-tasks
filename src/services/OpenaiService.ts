import fs from "fs/promises";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import OpenAI, { toFile } from "openai";
import { ImageConfig } from "./types/types";
import { TextService } from "./TextService";

interface Headers {
  [key: string]: string[];
}

export interface IDoc {
  text: string;
  metadata: {
    tokens: number;
    source?: string; // url / path
    mimeType?: string; // mime type
    name?: string; // filename
    sourceUUID?: string;
    uuid?: string;
    duration?: number; // duration in seconds
    headers?: Headers;
    urls?: string[];
    images?: string[];
    screenshots?: string[];
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export class OpenaiService {
  private openai: OpenAI;
  private textService: TextService;

  constructor() {
    this.openai = new OpenAI();
    this.textService = new TextService();
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
      model = "gpt-4o",
      stream = false,
      jsonMode = false,
      maxTokens = 4096,
    } = config;
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        ...(model !== "o1-mini" &&
          model !== "o1-preview" && {
            stream,
            max_tokens: maxTokens,
            response_format: jsonMode
              ? { type: "json_object" }
              : { type: "text" },
          }),
      });

      return stream
        ? (chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>)
        : (chatCompletion as OpenAI.Chat.Completions.ChatCompletion);
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

  async transcribe(
    audioBuffer: Buffer,
    config: { language: string; prompt?: string } = {
      language: "en",
      prompt: "",
    }
  ): Promise<string> {
    console.log("Transcribing audio...");

    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, "speech.ogg"),
      model: "whisper-1",
      language: config.language,
      prompt: config.prompt,
    });

    return transcription.text;
  }

  async transcribeMany(
    audioFiles: string[],
    config: { language: string; prompt?: string; fileName: string } = {
      language: "pl",
      prompt: "",
      fileName: "transcription.md",
    }
  ): Promise<IDoc[]> {
    console.log("Transcribing multiple audio files...");

    const results = await Promise.all(
      audioFiles.map(async (filePath) => {
        const buffer = await fs.readFile(filePath);
        const transcription = await this.transcribe(buffer, {
          language: config.language,
          prompt: config.prompt,
        });

        const doc = await this.textService.document(transcription, "gpt-4o", {
          source: filePath,
          name: config.fileName,
        });

        return doc;
      })
    );

    return results;
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

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response: OpenAI.CreateEmbeddingResponse =
        await this.openai.embeddings.create({
          model: "text-embedding-3-large",
          input: text,
        });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw error;
    }
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
}
