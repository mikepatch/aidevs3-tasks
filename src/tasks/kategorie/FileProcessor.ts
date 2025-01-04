import OpenAI from "openai";
import { OpenaiService } from "../../services/OpenaiService";
import { PREVIEW_IMAGE_SYSTEM_PROMPT } from "./prompts";
import { Recording, Image, ProcessedData } from "./types";
import fs from "fs/promises";
import path from "path";

export class FileProcessor {
  private readonly IMG_DIR = "img";
  private readonly MP3_DIR = "mp3";
  private readonly TXT_DIR = "txt";

  constructor(
    private readonly basePath: string,
    private readonly openaiService: OpenaiService
  ) {}

  async processData(): Promise<ProcessedData[]> {
    const [images, recordings, texts] = await Promise.all([
      this.processImages(),
      this.processRecordings(),
      this.processTexts(),
    ]);

    return [...images, ...recordings, ...texts];
  }

  private async extractImage(buffer: Buffer, filename: string): Promise<Image> {
    return {
      filename,
      base64: buffer.toString("base64"),
      desc: "",
    };
  }

  private async previewImage(image: Image): Promise<ProcessedData> {
    const userMessage: OpenAI.ChatCompletionMessageParam = {
      role: "user",
      content: [
        {
          type: "text",
          text: `Describe the image ${image.filename}.`,
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${image.base64}`,
          },
        },
      ],
    };
    try {
      const modelResponse = (await this.openaiService.getCompletion({
        jsonMode: true,
        messages: [PREVIEW_IMAGE_SYSTEM_PROMPT, userMessage],
      })) as OpenAI.ChatCompletion;

      const result = JSON.parse(
        modelResponse.choices[0].message.content || "{}"
      );

      console.log({ filename: result.name, preview: result.preview });

      return {
        filename: result.name || image.filename,
        desc: result.preview || "",
      };
    } catch (error) {
      console.error(`Error processing image ${image.filename}:`, error);
      return { filename: image.filename, desc: "" };
    }
  }

  private async processImages(): Promise<ProcessedData[]> {
    const imgFiles = await fs.readdir(path.join(this.basePath, this.IMG_DIR));

    return Promise.all(
      imgFiles.map(async (filename) => {
        const imgPath = path.join(this.basePath, this.IMG_DIR, filename);
        const imgBuffer = await fs.readFile(imgPath);
        const image = await this.extractImage(imgBuffer, filename);

        return this.previewImage(image);
      })
    );
  }

  private async transcribeRecording(audio: Recording): Promise<ProcessedData> {
    const modelResponse = await this.openaiService.transcribe(audio.buffer);

    console.log({ filename: audio.filename, transcription: modelResponse });

    return {
      filename: audio.filename,
      desc: modelResponse,
    };
  }

  private async processRecordings(): Promise<ProcessedData[]> {
    try {
      const mp3Files = await fs.readdir(path.join(this.basePath, this.MP3_DIR));

      return Promise.all(
        mp3Files.map(async (filename) => {
          const recordingPath = path.join(
            this.basePath,
            this.MP3_DIR,
            filename
          );
          const recordingBuffer = await fs.readFile(recordingPath);

          return this.transcribeRecording({
            filename,
            buffer: recordingBuffer,
          });
        })
      );
    } catch (error) {
      console.error("Error processing recordings:", error);
      return [];
    }
  }

  private async processTexts(): Promise<ProcessedData[]> {
    const txtFiles = await fs.readdir(path.join(this.basePath, this.TXT_DIR));

    return Promise.all(
      txtFiles.map(async (filename) => {
        const txtPath = path.join(this.basePath, this.TXT_DIR, filename);
        const txtBuffer = await fs.readFile(txtPath, "utf-8");

        return {
          filename,
          desc: txtBuffer,
        };
      })
    );
  }
}
