import { TasksProvider } from "../../services.ts/TasksProvider";
import data from "./test_data.json";
import {
  extractQuestionsForLLM,
  fixCalculations,
  getAnswersFromLLM,
} from "./tools";

const tasksService = new TasksProvider();

(async () => {
  fixCalculations(data);
  const questionsForLLM = extractQuestionsForLLM(data);
  await getAnswersFromLLM(questionsForLLM);

  //console.log(require("util").inspect(data, { depth: null }));

  const answerResponse = await tasksService.sendAnswer("JSON", data);
  console.log(answerResponse);
})();
