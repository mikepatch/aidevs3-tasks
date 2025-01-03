import OpenAI from "openai";
import { OpenaiProvider } from "../../services/OpenaiProvider";
import { TasksProvider } from "../../services/TasksProvider";

const openaiService = new OpenaiProvider();
const tasksService = new TasksProvider();

const DB_API_URL = "https://centrala.ag3nts.org/apidb";

const getData = async (query: string) => {
  const response = await fetch(DB_API_URL, {
    method: "POST",
    body: JSON.stringify({
      task: "database",
      apikey: process.env.AIDEVS_API_KEY,
      query,
    }),
  });

  return response.json();
};

const getSQLQuery = async (desc: string): Promise<string> => {
  try {
    const modelResponse = (await openaiService.getCompletion({
      messages: [
        {
          role: "system",
          content: `You're an expert in managing databases. Your task is to prepare a correct SQL query to the database. The database structure is provided by the user. You answer only with the pure SQL query and nothing else (without any formatting like markdown etc.).`,
        },
        {
          role: "user",
          content: desc,
        },
      ],
    })) as OpenAI.ChatCompletion;
    const result = modelResponse.choices[0].message.content;
    if (!result) throw new Error();

    return result;
  } catch (error) {
    console.error("There was an error during preparing SQL Query:", error);
    throw error;
  }
};

const main = async () => {
  //   SECRET FLAG
  //   const correctOrderResults = await getData("select * from correct_order");
  //   const flg = correctOrderResults.reply.sort(
  //     (a, b) => Number(a.weight) - Number(b.weight)
  //   );
  const { reply: tableList } = await getData("show tables");
  const { reply: datacentersTableStructure } = await getData(
    "show create table datacenters"
  );
  const { reply: connectionsTableStructure } = await getData(
    "show create table connections"
  );
  const { reply: usersTableStructure } = await getData(
    "show create table users"
  );

  const getResultQuery =
    await getSQLQuery(`Basing on the table structures below you have to prepare the SQL query to find active datacenters that are managed by managers that are currently on vacation.
          <table_list>${tableList}</table_list>
          <datacenters_table_structure>${datacentersTableStructure[0]["Create Table"]}</datacenters_table_structure>
          <connections_table_structure>${connectionsTableStructure[0]["Create Table"]}</connections_table_structure>
          <users_table_structure>${usersTableStructure[0]["Create Table"]}</users_table_structure>

          Please be very careful about table structures and create query basing only on these table structures.
          `);
  console.log(getResultQuery);

  const activeDatacenters = await getData(getResultQuery);
  console.log(activeDatacenters);
  const result = activeDatacenters.reply.map((datacenter) => datacenter.dc_id);

  console.log(result);

  const answerResponse = await tasksService.sendAnswer("database", result);
  console.log(answerResponse);
  //   console.log(
  //     await getData(`SELECT d.*
  // FROM datacenters d
  // JOIN users u ON d.manager = u.id
  // WHERE d.is_active = 1
  //   AND u.is_active = 0;`)
  //   );
};

main();
