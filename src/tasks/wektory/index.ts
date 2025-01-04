import { readdir, readFile } from "fs/promises";
import path from "path";
import { VectorService } from "../../services/VectorService";
import { OpenaiService } from "../../services/OpenaiService";
import { TextService} from "../../services/TextService";
import OpenAI from "openai";
import { TasksService } from "../../services/TasksService";

const openaiProvider = new OpenaiService();
const vectorService = new VectorService(openaiProvider);
const textSplitter = new TextService();
const tasksProvider = new TasksService();

const COLLECTION_NAME = "aidevs_wektory";

const initializeData = async () => {
  try {
    const dataDir = await readdir(path.join(__dirname, "data"));

    const dataContent: { date: string; text: string }[] = [];

    await Promise.all(
      dataDir.map(async (filename) => {
        const fileContent = await readFile(
          path.join(__dirname, "data", filename),
          "utf-8"
        );

        dataContent.push({
          date: formatDateFromFilename(filename),
          text: fileContent,
        });
      })
    );

    const points = await Promise.all(
      dataContent.map(async ({ date, text }) => {
        const doc = await textSplitter.document(text, "gpt-4o", { date });

        return doc;
      })
    );

    await vectorService.initializeCollectionWithData(
      COLLECTION_NAME,
      points,
      path.join(__dirname)
    );
  } catch (error) {
    console.error("Error during initializing data:", error);
    throw error;
  }
};

const formatDateFromFilename = (filename: string): string => {
  return filename.replace(".txt", "").replace(/_/g, "-");
};

const main = async () => {
  try {
    const exists = await vectorService.collectionExists(COLLECTION_NAME);
    if (!exists) {
      await initializeData();
    }

    const query =
      "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";

    try {
      const searchResults = await vectorService.performSearch(
        COLLECTION_NAME,
        query
      );

      const relevanceChecks = await Promise.all(
        searchResults.map(async (result) => {
          const relevanceCheck = (await openaiProvider.getCompletion({
            messages: [
              {
                role: "system",
                content: `You're a helpful assistant that determines if a given text is relevant to a query. Respond with 1 if relevant, 0 if not relevant.`,
              },
              {
                role: "user",
                content: `Query: ${query}\nText: ${result.payload?.text}`,
              },
            ],
          })) as OpenAI.ChatCompletion;

          const isRelevant = relevanceCheck.choices[0].message.content === "1";

          return { ...result, isRelevant };
        })
      );

      const relevantResults = relevanceChecks.filter(
        (result) => result.isRelevant
      );

      const result = relevantResults[0].payload?.date ?? "";

      const answerResponse = await tasksProvider.sendAnswer("wektory", result);

      console.log(answerResponse);
      console.log(`Query: ${query}`);
      console.table(
        relevantResults.map((result) => ({
          Date: result.payload?.date || "",
          Text:
            typeof result.payload?.text === "string"
              ? result.payload.text.slice(0, 45) + "..."
              : "",

          Score: result.score,
        }))
      );
    } catch (searchError) {
      console.error("Search operation failed:", searchError);
      throw searchError;
    }
  } catch (error) {
    console.error("Error in main process:", error);
    throw error;
  }
};

main();
