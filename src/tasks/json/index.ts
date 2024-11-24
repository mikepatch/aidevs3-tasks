import { TasksProvider } from "../../services/TasksProvider";
import data from "./test_data.json";
import {
  extractQuestionsForLLM,
  fixCalculations,
  getAnswersFromLLM,
} from "./tools";

(async () => {
  const tasksService = new TasksProvider();
  fixCalculations(data);
  const questionsForLLM = extractQuestionsForLLM(data);
  await getAnswersFromLLM(questionsForLLM);

  //console.log(require("util").inspect(data, { depth: null }));

  const answerResponse = await tasksService.sendAnswer("JSON", data);
  console.log(answerResponse);
})();
