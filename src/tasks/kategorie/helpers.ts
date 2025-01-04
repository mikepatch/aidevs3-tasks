import OpenAI from "openai";
import { OpenaiService } from "../../services/OpenaiService";
import { ProcessedData } from "./types";
import { CATEGORIZE_SYSTEM_PROMPT } from "./prompts";

type CategorizedItem = {
  filename: string;
  category: string;
};

export const categorizeContent = async (
  content: string,
  openaiService: OpenaiService
): Promise<{ category: string }> => {
  try {
    const modelResponse = (await openaiService.getCompletion({
      model: "gpt-4o",
      messages: [CATEGORIZE_SYSTEM_PROMPT, { role: "user", content }],
    })) as OpenAI.ChatCompletion;

    const result = modelResponse.choices[0].message.content;
    const resultTrimmed = result?.replace(/['"]/g, "").trim() || "0";

    return {
      category: resultTrimmed,
    };
  } catch (error) {
    console.error("Error categorizing content:", error);
    return { category: "0" };
  }
};

export const categorizeItems = async (
  items: ProcessedData[],
  openaiService: OpenaiService
): Promise<Record<string, string[]>> => {
  const categorized = await Promise.all(
    items.map(async (item): Promise<CategorizedItem> => {
      const categorizedItem = await categorizeContent(item.desc, openaiService);

      return {
        filename: item.filename,
        category: categorizedItem.category,
      };
    })
  );

  return formatResults(categorized);
};

const formatResults = (
  categorizedItems: CategorizedItem[]
): Record<string, string[]> => {
  const grouped = categorizedItems.reduce((acc, item) => {
    if (item.category === "0") return acc;

    return {
      ...acc,
      [item.category]: [...(acc[item.category] || []), item.filename],
    };
  }, {} as Record<string, string[]>);

  return Object.fromEntries(
    Object.entries(grouped).map(([category, files]) => [
      category,
      [...files].sort((a, b) => a.localeCompare(b)),
    ])
  );
};
