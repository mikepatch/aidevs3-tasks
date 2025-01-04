import { TasksService } from "../../services/TasksService";
import { CONNECTIONS_FILE_NAME, USERS_FILE_NAME } from "./constants";
import { Neo4jService } from "./Neo4jService";
import {
  checkDBFilesExist,
  getDatabaseStats,
  saveDatabaseFile,
  seedDatabase,
} from "./utils";

if (
  !process.env.NEO4J_URI ||
  !process.env.NEO4J_USER ||
  !process.env.NEO4J_PASSWORD
) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set");
}

const tasksProvider = new TasksService();
const neo4jService = new Neo4jService(
  process.env.NEO4J_URI,
  process.env.NEO4J_USER,
  process.env.NEO4J_PASSWORD
);

const fetchAndSaveDatabase = async () => {
  const { reply: connections } = await tasksProvider.queryDatabase(
    "SELECT * FROM connections;"
  );
  const { reply: users } = await tasksProvider.queryDatabase(
    "SELECT * FROM users;"
  );

  await saveDatabaseFile(CONNECTIONS_FILE_NAME, connections);
  await saveDatabaseFile(USERS_FILE_NAME, users);
};

const getShortestPath = async (
  fromUsername: string,
  toUsername: string
): Promise<string> => {
  const query = `
    MATCH (start:User {username: $fromUsername}),
          (end:User {username: $toUsername}),
          path = shortestPath((start)-[:KNOWS*]-(end))
    RETURN [node in nodes(path) | node.username] as usernames
  `;

  try {
    const result = await neo4jService.runQuery(query, {
      fromUsername,
      toUsername,
    });

    if (result.records.length === 0) {
      return `No path found between users ${fromUsername} and ${toUsername}`;
    }

    const usernames = result.records[0].get("usernames");
    return usernames.join(", ");
  } catch (error) {
    console.error("Error finding shortest path:", error);
    throw error;
  }
};

const main = async () => {
  if (!(await checkDBFilesExist([CONNECTIONS_FILE_NAME, USERS_FILE_NAME]))) {
    await fetchAndSaveDatabase();
  }

  try {
    // await seedDatabase();
    // await getDatabaseStats();
    const path = await getShortestPath("Rafał", "Barbara");
    console.log("🛣️ Shortest path:", path);
    const answerResponse = await tasksProvider.sendAnswer("connections", path);

    console.log(answerResponse);
  } catch (error) {
    console.error("Failed to seed database:", error);
  } finally {
    await neo4jService.close();
  }
};

main();
