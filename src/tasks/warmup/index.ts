import { TasksProvider } from "../../services/TasksProvider";

(async () => {
  const tasksService = new TasksProvider();
  const response = await fetch("https://poligon.aidevs.pl/dane.txt");
  const parsedResponse = await response.text();
  const responseArr = parsedResponse.trim().split("\n");

  console.log(responseArr);

  const answerResponse = await tasksService.sendAnswer("POLIGON", responseArr); //TasksProvider endpoint changed so it will not work now
  console.log(answerResponse);
})();
