import { TasksService } from "../../services/TasksService";

(async () => {
  const tasksProvider = new TasksService();
  const response = await fetch("https://poligon.aidevs.pl/dane.txt");
  const parsedResponse = await response.text();
  const responseArr = parsedResponse.trim().split("\n");

  console.log(responseArr);

  const answerResponse = await tasksProvider.sendAnswer("POLIGON", responseArr); //TasksService endpoint changed so it will not work now
  console.log(answerResponse);
})();
