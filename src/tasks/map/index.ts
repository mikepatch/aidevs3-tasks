import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import sharp from "sharp";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { ResizedImageMetadata } from "./types";
import { OpenaiService } from "../../services/OpenaiService";

const openai = new OpenaiService();

const IMAGE_DETAIL: "low" | "high" = "high";

const processImage = async (
  imagePath: string
): Promise<{ imageBase64: string; metadata: ResizedImageMetadata }> => {
  try {
    const imageBuffer = readFileSync(imagePath);
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(2048, 2048, { fit: "inside" })
      .png({ compressionLevel: 5 })
      .toBuffer();
    const optimizedImagePath = path.join(
      __dirname,
      "optimized-images",
      path.basename(imagePath)
    );

    await sharp(resizedImageBuffer).toFile(optimizedImagePath);

    const imageBase64 = resizedImageBuffer.toString("base64");
    const metadata = await sharp(resizedImageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to retrieve image dimensions.");
    }

    return {
      imageBase64,
      metadata: { width: metadata.width, height: metadata.height },
    };
  } catch (error) {
    console.error("Image processing failed: ", error);
    throw error;
  }
};

const processImages = async (): Promise<
  { imageBase64: string; metadata: ResizedImageMetadata }[]
> => {
  try {
    const imagesDir = path.join(__dirname, "images");
    const imageFiles = readdirSync(imagesDir);

    const processedImages = await Promise.all(
      imageFiles.map(async (fileName) => {
        const imagePath = path.join(imagesDir, fileName);

        return processImage(imagePath);
      })
    );

    return processedImages;
  } catch (error) {
    console.error("Failed to process images:", error);
    throw error;
  }
};

const transformMessageContent = (
  message: ChatCompletionMessageParam
): ChatCompletionMessageParam => {
  if (typeof message.content === "string") {
    return {
      role: message.role,
      content: message.content,
    } as ChatCompletionMessageParam;
  } else {
    const textContent = message.content?.find(
      (contentPart): contentPart is OpenAI.ChatCompletionContentPartText =>
        "text" in contentPart
    )?.text as string;
    return {
      role: message.role,
      content: textContent,
    } as ChatCompletionMessageParam;
  }
};

const calculateTotalImageTokens = async (
  processedImages: { imageBase64: string; metadata: ResizedImageMetadata }[]
): Promise<number> => {
  let totalTokens = 0;

  for (const { metadata } of processedImages) {
    const imageToknes = await openai.calculateImageTokens(
      metadata.width,
      metadata.height,
      IMAGE_DETAIL
    );
    totalTokens += imageToknes;
  }

  return totalTokens;
};

(async () => {
  try {
    const processedImages = await processImages();
    const imagesTokenCost = await calculateTotalImageTokens(processedImages);

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are an expert in identifying cities based on detailed map fragments. Your analysis is thorough, with a sharp focus on every detail, including streets, landmarks, topography, and urban layouts. You base your conclusions solely on the information visible in the map fragment and never speculate or provide uncertain answers.",
      },
      {
        role: "user",
        content: [
          ...processedImages.map(({ imageBase64 }) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: IMAGE_DETAIL,
            },
          })),
          {
            type: "text",
            text: `
            Na podstawie dostarczonych w fragmentów mapy, określ, z jakiego miasta one pochodzą. Przeanalizuj dokładnie każde zdjęcie i weź pod uwagę wszystkie szczegóły. Zwróć wyłącznie samą nazwę poprawnego miasta.
            
              Uwaga! Jeden z fragmentów mapy może być błędny i może pochodzić z innego miasta. 
            
              Wskazówka: W tym mieście są spichlerze i twierdze.
              `,
          },
        ],
      },
    ];

    const mappedMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
      transformMessageContent
    );
    const textTokenCost = await openai.countTokens(mappedMessages);
    const totalTokenCost = imagesTokenCost + textTokenCost;

    const completion = (await openai.getCompletion({
      messages,
      model: "gpt-4o",
    })) as OpenAI.ChatCompletion;

    console.log(completion.choices[0].message.content);
    console.log(`-----------------------------------`);
    console.log(`Image Tokens: ${imagesTokenCost}`);
    console.log(`Text Tokens: ${textTokenCost}`);
    console.log(`-----------------------------------`);
    console.log(`Estimated Prompt Tokens: ${totalTokenCost}`);
    console.log(`Actual Prompt Tokens: ${completion.usage?.prompt_tokens}`);
    console.log(`-----------------------------------`);
    console.log(`Total Token Usage: ${completion.usage?.total_tokens}`);
  } catch (error) {
    console.error("An error occurred during execution: ", error);
  }
})();
