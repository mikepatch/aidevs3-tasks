import { OpenaiService } from "../../services/OpenaiService";
import { TasksService } from "../../services/TasksService";
import { WebScrapingAgent } from "./WebScrapingAgent";

const SCRAPPING_URL = "https://softo.ag3nts.org";

const main = async () => {
  const tasksProvider = new TasksService();
  const openaiProvider = new OpenaiService();
  const questions = await tasksProvider.getData("/softo.json");

  const agent = new WebScrapingAgent(SCRAPPING_URL, openaiProvider);
  const answers = await agent.findAnswers(questions);

  console.log("\n📊 Final Results:");
  console.log(JSON.stringify(answers, null, 2));
  const result = answers.reduce(
    (acc, answer) => ({
      ...acc,
      [answer.questionId]: answer.answer,
    }),
    {}
  );
  const answerResponse = await tasksProvider.sendAnswer("softo", result);
  console.log(answerResponse);
};

main();
