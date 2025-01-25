import sharp from "sharp";
import { createWorker, Worker } from "tesseract.js";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import path from "path";
import fs from "fs/promises";

export class ImageProcessor {
  private tesseractWorker: Worker | null = null;
  private googleVisionClient: ImageAnnotatorClient | null = null;
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
  }

  async init(language = "pol") {
    this.tesseractWorker = await createWorker(language);
  }

  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
    }
  }

  // Wstępne sprawdzenie czy obrazek zawiera tekst
  async hasText(
    imageBuffer: Buffer
  ): Promise<{ hasText: boolean; confidence: number }> {
    if (!this.tesseractWorker)
      throw new Error("Tesseract worker not initialized");

    const {
      data: { confidence },
    } = await this.tesseractWorker.recognize(imageBuffer);
    return {
      hasText: confidence > 30,
      confidence,
    };
  }

  // Podstawowe przetwarzanie obrazu
  async processImage(imageBuffer: Buffer) {
    return sharp(imageBuffer)
      .normalize()
      .modulate({
        brightness: 1.2,
        lightness: 1.2,
      })
      .sharpen()
      .threshold(128)
      .toBuffer();
  }

  // Próba odwrócenia maskowania
  async unmaskImage(imageBuffer: Buffer) {
    return sharp(imageBuffer).negate().gamma(2.2).toBuffer();
  }

  // Łączenie obrazków
  async mergeImages(imagePaths: string[]) {
    const images = await Promise.all(
      imagePaths.map(async (path) => ({
        input: await fs.readFile(path),
        top: 0,
        left: 0,
      }))
    );

    return sharp({
      create: {
        width: 1000,
        height: 2000,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite(images)
      .toBuffer();
  }

  // Zapisywanie obrazka do pliku
  async saveImage(imageBuffer: Buffer, filename: string) {
    const outputPath = path.join(this.tempDir, filename);
    await fs.writeFile(outputPath, imageBuffer);
    return outputPath;
  }

  // Pełne OCR z Google Vision (opcjonalne)
  async performOCR(imageBuffer: Buffer) {
    if (!this.googleVisionClient) {
      throw new Error("Google Vision client not initialized");
    }

    const [result] = await this.googleVisionClient.textDetection({
      image: { content: imageBuffer.toString("base64") },
    });

    return result.textAnnotations?.[0]?.description || "";
  }
}
