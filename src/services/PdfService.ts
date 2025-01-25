import * as pdfjsLib from "pdfjs-dist";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import { GoogleCloudService } from "./GoogleCloudService";
import { logMessage } from "../utils";

export class PdfService {
  private tempDir: string;
  private googleCloud: GoogleCloudService;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
    this.googleCloud = new GoogleCloudService();
  }

  async downloadPdf(url: string, outputPath: string): Promise<void> {
    logMessage({
      type: "process",
      title: "Downloading PDF",
      details: {
        URL: url,
        Output: outputPath,
      },
    });

    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      await fs.writeFile(outputPath, response.data);

      logMessage({
        type: "success",
        title: "PDF Downloaded Successfully",
        details: { Size: `${response.data.length} bytes` },
      });
    } catch (error: unknown) {
      logMessage({
        type: "error",
        title: "PDF Download Failed",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async extractText(pdfPath: string): Promise<{
    machineText: string;
    handwrittenText: string;
  }> {
    logMessage({
      type: "process",
      title: "Starting Text Extraction",
      details: { "PDF Path": pdfPath },
    });

    const buffer = await fs.readFile(pdfPath);
    const data = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    await fs.mkdir(this.tempDir, { recursive: true });

    try {
      logMessage({
        type: "info",
        title: "Extracting Machine Text",
        details: { Pages: pdf.numPages },
      });
      const machineText = await this.extractMachineText(pdf);

      logMessage({
        type: "info",
        title: "Extracting Handwritten Text",
      });
      const handwrittenText = await this.extractHandwrittenText();

      logMessage({
        type: "success",
        title: "Text Extraction Complete",
        details: {
          "Machine text length": machineText.length,
          "Handwritten text length": handwrittenText.length,
        },
      });

      return {
        machineText,
        handwrittenText,
      };
    } catch (error: unknown) {
      logMessage({
        type: "error",
        title: "Text Extraction Failed",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // Clear temp dir
      await fs.rm(this.tempDir, { recursive: true, force: true });
    }
  }

  private async extractMachineText(
    pdf: pdfjsLib.PDFDocumentProxy,
  ): Promise<string> {
    let fullText = "";
    const uniqueImageSizes = new Map<string, boolean>();

    logMessage({
      type: "process",
      title: "Processing PDF Pages",
      details: { "Total pages": pdf.numPages },
    });

    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);

        logMessage({
          type: "info",
          title: `Processing Page ${i}`,
          details: { "Page number": i },
        });

        const textContent = await page.getTextContent();
        fullText +=
          textContent.items.map((item: any) => item.str).join(" ") + "\n\n";

        // Process images
        const resources = await page.getOperatorList();
        let imagesFound = 0;

        for (let j = 0; j < resources.fnArray.length; j++) {
          if (resources.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
            const image = await page.objs.get(resources.argsArray[j][0]);
            if (image?.data && image.width > 800 && image.height > 800) {
              try {
                // Create sharp instance for analysis
                const sharpImage = sharp(Buffer.from(image.data), {
                  raw: {
                    width: image.width,
                    height: image.height,
                    channels: 3,
                  },
                });

                // Get image stats
                const stats = await sharpImage.stats();

                // Calculate image characteristics
                const { channels } = stats;
                const avgIntensity =
                  channels.reduce((sum, channel) => sum + channel.mean, 0) /
                  channels.length;
                const avgStdDev =
                  channels.reduce((sum, channel) => sum + channel.stdev, 0) /
                  channels.length;

                // Bardziej liberalne warunki dla tekstu odręcznego:
                // - Niższy próg kontrastu (> 10 zamiast > 20)
                // - Szerszy zakres jasności (50-220 zamiast 100-200)
                // - Bardziej elastyczny współczynnik proporcji
                const aspectRatio = image.width / image.height;
                const isTextLike =
                  avgStdDev > 10 && // Niższy próg kontrastu dla tekstu odręcznego
                  avgIntensity > 50 &&
                  avgIntensity < 220 && // Szerszy zakres jasności
                  aspectRatio > 0.2 &&
                  aspectRatio < 5; // Bardziej elastyczne proporcje

                if (isTextLike) {
                  const sizeKey = `${image.width}_${image.height}_${image.data.length}`;
                  if (!uniqueImageSizes.has(sizeKey)) {
                    uniqueImageSizes.set(sizeKey, true);
                    const imagePath = path.join(
                      this.tempDir,
                      `text_image_${i}_${j}.png`,
                    );

                    await sharpImage.sharpen().png().toFile(imagePath);

                    imagesFound++;
                  }
                }
              } catch (error) {
                logMessage({
                  type: "warning",
                  title: "Image Processing Warning",
                  message:
                    error instanceof Error ? error.message : String(error),
                  details: { Page: i, Image: j },
                });
                continue;
              }
            }
          }
        }

        if (imagesFound > 0) {
          logMessage({
            type: "success",
            title: `Page ${i} Processed`,
            details: {
              "Images extracted": imagesFound,
              "Text length": textContent.items.length,
            },
          });
        }
      } catch (error) {
        logMessage({
          type: "error",
          title: `Failed to Process Page ${i}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return fullText;
  }

  private async extractHandwrittenText(): Promise<string> {
    const files = await fs.readdir(this.tempDir);
    logMessage({
      type: "process",
      title: "Processing Images",
      details: { "Found files": files.length },
    });

    let allText: string[] = [];

    for (const file of files) {
      if (!file.endsWith(".png")) continue;

      try {
        const imagePath = path.join(this.tempDir, file);
        const imageContent = await fs.readFile(imagePath);

        logMessage({
          type: "info",
          title: `Processing ${file}`,
          details: { Size: `${imageContent.length} bytes` },
        });

        const text = await this.googleCloud.detectDocumentText(imageContent, {
          languageHints: ["pl"],
          retries: 3,
          retryDelay: 1000,
        });

        if (text && text.trim()) {
          allText.push(text);
          logMessage({
            type: "success",
            title: `Text Extracted from ${file}`,
            details: {
              Length: `${text.length} characters`,
              Sample: text.substring(0, 50) + "...",
            },
          });
        }
      } catch (error: unknown) {
        logMessage({
          type: "error",
          title: `Failed to process ${file}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const finalText = allText.join("\n\n");
    logMessage({
      type: "success",
      title: "Text Extraction Complete",
      details: {
        "Processed files": files.length,
        "Successful extractions": allText.length,
        "Total text length": finalText.length,
      },
    });

    return finalText;
  }
}
