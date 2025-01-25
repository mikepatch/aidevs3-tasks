import { TasksService } from "../../services/TasksService";

const tasksProvider = new TasksService();

const main = async () => {
  const apiUrl = "https://aidevs.whatacode.dev/api/chat";
  const answerResponse = await tasksProvider.sendAnswer("webhook", apiUrl);

  console.log(answerResponse);
};

main();
