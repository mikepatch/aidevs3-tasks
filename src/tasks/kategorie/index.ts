import { OpenaiProvider } from "../../services/OpenaiProvider";
import { TasksProvider } from "../../services/TasksProvider";
import { FileProcessor } from "./FileProcessor";
import { categorizeItems } from "./helpers";

(async () => {
  const openaiService = new OpenaiProvider();
  const tasksProvider = new TasksProvider();
  const fileProcessor = new FileProcessor(__dirname, openaiService);

  try {
    const processedData = await fileProcessor.processData();
    const sortedResult = await categorizeItems(processedData, openaiService);

    const answerResponse = await tasksProvider.sendAnswer(
      "kategorie",
      sortedResult
    );

    console.log({ sortedResult, answerResponse });
  } catch (error) {
    console.error("Error: ", error);
  }
})();
