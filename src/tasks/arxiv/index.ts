import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import fs from "fs/promises";
import path from "path";
import { OpenaiService } from "../../services/OpenaiService";
import OpenAI from "openai";
import { TasksService } from "../../services/TasksService";

const openaiProvider = new OpenaiService();
const tasksProvider = new TasksService();

type ImageAnalysis = {
  url: string;
  description: string;
  index: number;
};

type AudioAnalysis = {
  url: string;
  transcription: string;
};

const parseToMarkdown = (baseUrl: string, htmlContent: string) => {
  const dom = new JSDOM(htmlContent, { url: baseUrl });
  const document = dom.window.document;

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  turndownService.addRule("images", {
    filter: ["img"],
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const absoluteUrl = new URL(img.src, baseUrl).href;

      return `![${img.alt || ""}](${absoluteUrl})`;
    },
  });

  turndownService.addRule("figures", {
    filter: "figure",
    replacement: (_content, node) => {
      const figure = node as HTMLElement;
      const img = figure.querySelector("img");
      const figcaption = figure.querySelector("figcaption");

      if (!img) return "";

      const absoluteUrl = new URL(img.src, baseUrl).href;
      const caption = figcaption?.textContent?.trim() || "";
      const alt = img.alt || caption;

      return `![${alt}](${absoluteUrl})`;
    },
  });

  turndownService.addRule("audioLinks", {
    filter: (node) => {
      return (
        (node.nodeName === "A" &&
          node.getAttribute("href")?.includes(".mp3")) ??
        false
      );
    },
    replacement: (content, node) => {
      const link = node as HTMLAnchorElement;
      const absoluteUrl = new URL(link.href, baseUrl).href;

      return `[${content}](${absoluteUrl})`;
    },
  });

  const markdown = turndownService.turndown(document.body);

  return markdown;
};

const extractAudioFromMarkdown = (markdown: string): string[] => {
  const audioRegex = /\[.*?\]\((.*?\.mp3)\)/g;
  const matches = [...markdown.matchAll(audioRegex)];
  return matches.map((match) => match[1]);
};

const downloadAudio = async (url: string): Promise<Buffer> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading audio from ${url}:`, error);
    throw error;
  }
};

const analyzeAudio = async (audioUrls: string[]): Promise<AudioAnalysis[]> => {
  const analyses: AudioAnalysis[] = [];

  for (const url of audioUrls) {
    try {
      console.log(`Downloading and transcribing audio: ${url}`);
      const audioBuffer = await downloadAudio(url);

      const transcriptionResponse = await openaiProvider.transcribe(
        audioBuffer
      );

      const transcription = transcriptionResponse;

      analyses.push({
        url,
        transcription,
      });
    } catch (error) {
      console.error(`Error transcribing audio ${url}:`, error);
      analyses.push({
        url,
        transcription: "Error transcribing audio",
      });
    }
  }

  return analyses;
};

const addAudioTranscriptionsToMarkdown = (
  markdown: string,
  audioAnalyses: AudioAnalysis[]
): string => {
  let updatedMarkdown = markdown;

  for (const analysis of audioAnalyses) {
    const audioPattern = new RegExp(
      `\\[([^\\]]*)\\]\\(${escapeRegExp(analysis.url)}\\)`,
      "g"
    );
    const replacement = `[${analysis.url.split("/").pop()}](${
      analysis.url
    })\n\n*Transcribed audio: ${analysis.transcription}*`;
    updatedMarkdown = updatedMarkdown.replace(audioPattern, replacement);
  }

  return updatedMarkdown;
};

const extractImagesFromMarkdown = (markdown: string): string[] => {
  const imageRegex = /!\[(?:.*?)\]\((.*?)\)/g;
  const matches = [...markdown.matchAll(imageRegex)];
  return matches.map((match) => match[1]);
};

const analyzeImages = async (imageUrls: string[]): Promise<ImageAnalysis[]> => {
  const analyses: ImageAnalysis[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      // Placeholder for vision LLM implementation
      console.log(`Analyzing image ${i + 1}/${imageUrls.length}: ${url}`);

      const visionResponse = (await openaiProvider.getCompletion({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please describe in polish what do you see in the picture",
              },
              {
                type: "image_url",
                image_url: {
                  url,
                },
              },
            ],
          },
        ],
      })) as OpenAI.ChatCompletion;

      const description = visionResponse.choices[0].message.content;

      analyses.push({
        url,
        description: description ?? "",
        index: i + 1,
      });
    } catch (error) {
      console.error(`Error analyzing image ${url}:`, error);
      analyses.push({
        url,
        description: "Error analyzing image",
        index: i + 1,
      });
    }
  }

  return analyses;
};

const addImageDescriptionsToMarkdown = (
  markdown: string,
  imageAnalyses: ImageAnalysis[]
): string => {
  let updatedMarkdown = markdown;

  for (const analysis of imageAnalyses) {
    const imagePattern = new RegExp(
      `(!\\[([^\\]]*)\\]\\(${escapeRegExp(analysis.url)}\\))`,
      "g"
    );
    const replacement = `$1\n\n*Image preview ${analysis.index}: ${analysis.description}*`;
    updatedMarkdown = updatedMarkdown.replace(imagePattern, replacement);
  }

  return updatedMarkdown;
};

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getArticlePath = () => {
  const articleDir = path.join(__dirname, "article");
  return path.join(articleDir, "article.md");
};

const checkArticleExists = async (): Promise<boolean> => {
  try {
    const filePath = getArticlePath();
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const saveArticle = async (parsedHtml: string) => {
  const articleDir = path.join(__dirname, "article");
  await fs.mkdir(articleDir, { recursive: true });
  await fs.writeFile(getArticlePath(), parsedHtml, "utf-8");
};

const fetchArticleContent = async (url: string): Promise<string> => {
  const response = await fetch(url);
  return response.text();
};

const processImages = async (markdown: string): Promise<string> => {
  const imageUrls = extractImagesFromMarkdown(markdown);
  console.log("Found images: ", imageUrls);

  const imageAnalyses = await analyzeImages(imageUrls);
  console.log("Image analyses: ", imageAnalyses);

  return addImageDescriptionsToMarkdown(markdown, imageAnalyses);
};

const processAudio = async (markdown: string): Promise<string> => {
  const audioUrls = extractAudioFromMarkdown(markdown);
  console.log("Found audio files:", audioUrls);

  const audioAnalyses = await analyzeAudio(audioUrls);
  console.log("Audio analyses:", audioAnalyses);

  return addAudioTranscriptionsToMarkdown(markdown, audioAnalyses);
};

const main = async () => {
  try {
    const taskDataResponse = await tasksProvider.getData("arxiv.txt");
    console.log(taskDataResponse);

    const savedArticle = await fs.readFile(
      path.join(__dirname, "article", "article.md"),
      "utf-8"
    );

    const modelResponse = (await openaiProvider.getCompletion({
      model: "gpt-4o",
      jsonMode: true,
      messages: [
        {
          role: "system",
          content: `
          <main_subject>
          Jesteś ekspertem w analizowaniu dokumentów i odpowiadaniu na pytania. Poprawne odpowiedzi na pytania zwracasz zawsze w formacie JSON o poniższej przykładowej strukturze:
          </main_subject>
<answer_example>
{
    "01": "krótka odpowiedź w 1 zdaniu",
    "02": "krótka odpowiedź w 1 zdaniu",
    "03": "krótka odpowiedź w 1 zdaniu",
    "NN": "krótka odpowiedź w 1 zdaniu"
}
</answer_example>

<rules>
Nie dodawaj żadnych znaków nowej linii ani dodatkowych spacji.
Zawsze trzymaj się struktury JSON ustalonej w <answer_example>. Nie dodawaj dodatkowych miejsc na numer w ID-pytania-XX.
Musisz odpowiedzieć na wszystkie pytania!
</rules>

<thinking>Nie śpiesz się z odpowiedzią. Przeczytaj dokładnie treść pytania, następnie dwukrotnie zastanów się przed udzieleniem odpowiedzi na podstawie dokumentu.</thinking>

<additional_context>Adam mieszka w Krakowie</additional_context>
`,
        },
        {
          role: "user",
          content: `
          Pytania: ${taskDataResponse}
          Dokument: ${savedArticle}`,
        },
      ],
    })) as OpenAI.ChatCompletion;

    const result = modelResponse.choices[0].message.content;

    if (!result) throw new Error("Something went wrong with answers!");

    console.log({ answers: result });

    const parsedResult = JSON.parse(result);

    const taskAnswerResponse = await tasksProvider.sendAnswer(
      "arxiv",
      parsedResult
    );

    console.log(taskAnswerResponse);

    const articleExists = await checkArticleExists();
    if (articleExists) {
      console.log("Article already exists, skipping processing");
      return;
    }

    const articleUrl = "https://centrala.ag3nts.org/dane/arxiv-draft.html";

    const htmlContent = await fetchArticleContent(articleUrl);
    let markdown = parseToMarkdown(articleUrl, htmlContent);

    markdown = await processImages(markdown);
    markdown = await processAudio(markdown);

    await saveArticle(markdown);
  } catch (error) {
    console.error("Error in main process: ", error);
    throw error;
  }
};

main();
