import TasksProvider from "../../services.ts/TasksProvider";

(async () => {
  const response = await fetch("https://poligon.aidevs.pl/dane.txt");
  const parsedResponse = await response.text();
  const responseArr = parsedResponse.trim().split("\n");

  console.log(responseArr);

  const answerResponse = await TasksProvider.sendAnswer("POLIGON", responseArr); //TasksProvider endpoint changed so it will not work now
  console.log(answerResponse);
})();
