import { TasksService } from "../../services/TasksService";
import data from "./test_data.json";
import {
  extractQuestionsForLLM,
  fixCalculations,
  getAnswersFromLLM,
} from "./tools";

(async () => {
  const tasksProvider = new TasksService();
  fixCalculations(data);
  const questionsForLLM = extractQuestionsForLLM(data);
  await getAnswersFromLLM(questionsForLLM);

  //console.log(require("util").inspect(data, { depth: null }));

  const answerResponse = await tasksProvider.sendAnswer("JSON", data);
  console.log(answerResponse);
})();
