import TasksProvider from "../../services.ts/TasksProvider";
import data from "./test_data.json";
import {
  extractQuestionsForLLM,
  fixCalculations,
  getAnswersFromLLM,
} from "./tools";

(async () => {
  fixCalculations(data);
  const questionsForLLM = extractQuestionsForLLM(data);
  await getAnswersFromLLM(questionsForLLM);

  //console.log(require("util").inspect(data, { depth: null }));

  const answerResponse = await TasksProvider.sendAnswer("JSON", data);
  console.log(answerResponse);
})();
