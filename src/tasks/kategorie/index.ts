import { OpenaiService } from "../../services/OpenaiService";
import { TasksService } from "../../services/TasksService";
import { FileProcessor } from "./FileProcessor";
import { categorizeItems } from "./helpers";

(async () => {
  const openaiProvider = new OpenaiService();
  const tasksProvider = new TasksService();
  const fileProcessor = new FileProcessor(__dirname, openaiProvider);

  try {
    const processedData = await fileProcessor.processData();
    const sortedResult = await categorizeItems(processedData, openaiProvider);

    const answerResponse = await tasksProvider.sendAnswer(
      "kategorie",
      sortedResult
    );

    console.log({ sortedResult, answerResponse });
  } catch (error) {
    console.error("Error: ", error);
  }
})();
