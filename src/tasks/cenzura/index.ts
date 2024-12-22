import { TasksProvider } from "../../services/TasksProvider";
import { LOCAL_MODEL_SYSTEM_PROMPT } from "./prompts";

const tasksService = new TasksProvider();

const processData = async (
  dataToProcess: string
): Promise<{ response: string }> => {
  const processedDataResponse = await fetch(
    "http://localhost:11434/api/generate",
    {
      method: "POST",
      body: JSON.stringify({
        model: "llama2:7b",
        system: LOCAL_MODEL_SYSTEM_PROMPT,
        prompt: dataToProcess,
        stream: false,
      }),
    }
  );
  const result = (await processedDataResponse.json()) as { response: string };

  return result;
};

(async () => {
  const dataToProcess = await tasksService.getData("cenzura.txt");

  console.log({ dataToProcess });
  const processedData = await processData(dataToProcess);

  const result = processedData.response
    .replaceAll("PLACEHOLDER", "CENZURA")
    .replaceAll("\n", "");
  console.log({ processedData: processedData.response });
  console.log({ result });
  const answerResponse = await tasksService.sendAnswer("CENZURA", result);
  console.log(answerResponse);
})();
