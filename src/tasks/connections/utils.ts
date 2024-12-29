import fs from "fs/promises";
import path from "path";
import { CONNECTIONS_FILE_NAME, USERS_FILE_NAME } from "./constants";
import { Connection, User } from "./types";
import { Neo4jService } from "./Neo4jService";

if (
  !process.env.NEO4J_URI ||
  !process.env.NEO4J_USER ||
  !process.env.NEO4J_PASSWORD
) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set");
}

const neo4jService = new Neo4jService(
  process.env.NEO4J_URI,
  process.env.NEO4J_USER,
  process.env.NEO4J_PASSWORD
);

const checkFileExists = async (filename: string) => {
  try {
    console.log("File already exists, skipping process...");
    await fs.access(path.join(__dirname, filename));

    return true;
  } catch {
    return false;
  }
};

export const checkDBFilesExist = async (
  filenames: string[]
): Promise<boolean> => {
  try {
    const results = await Promise.all(
      filenames.map((filename) => checkFileExists(filename))
    );

    return results.every((exists) => exists);
  } catch (error) {
    console.error("Error checking DB files:", error);

    return false;
  }
};

export const saveDatabaseFile = async (filename: string, data: string) => {
  try {
    console.log("🚀 ~ saveDatabaseFile ~ fileName:", filename);
    await fs.writeFile(
      path.join(__dirname, filename),
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error("Error saving database file:", error);

    throw error;
  }
};

const readJsonFile = async <T>(fileName: string): Promise<T> => {
  try {
    const filePath = path.join(__dirname, fileName);
    const rawData = await fs.readFile(filePath, "utf8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    throw error;
  }
};

export const getConnections = () =>
  readJsonFile<Connection[]>(CONNECTIONS_FILE_NAME);
export const getUsers = () => readJsonFile<User[]>(USERS_FILE_NAME);

const checkDatabaseEmpty = async (): Promise<boolean> => {
  const result = await neo4jService.runQuery(`
    MATCH (n:User)
    RETURN count(n) as count
  `);

  const count = result.records[0].get("count").toNumber();
  return count === 0;
};

const checkUserExists = async (userId: string): Promise<boolean> => {
  const node = await neo4jService.findNodeByProperty("User", "id", userId);
  return node !== null;
};

const checkConnectionExists = async (
  user1Id: number,
  user2Id: number
): Promise<boolean> => {
  const result = await neo4jService.runQuery(
    `
    MATCH (u1)-[r:KNOWS]->(u2)
    WHERE id(u1) = $user1Id AND id(u2) = $user2Id
    RETURN count(r) as count
  `,
    { user1Id, user2Id }
  );

  return result.records[0].get("count").toNumber() > 0;
};

const createUsers = async (users: User[]): Promise<Map<string, number>> => {
  console.log("📥 Checking existing users...");

  const isEmpty = await checkDatabaseEmpty();

  if (!isEmpty) {
    console.log("⚠️ Database already contains users!");

    // Return existing user mappings instead of creating new ones
    const userIdMap = new Map<string, number>();
    await Promise.all(
      users.map(async (user) => {
        const node = await neo4jService.findNodeByProperty(
          "User",
          "id",
          user.id
        );
        if (node) {
          userIdMap.set(user.id, node.id);
        }
      })
    );
    return userIdMap;
  }

  console.log("📥 Adding new users...");
  await neo4jService.batchAddNodes("User", users);

  const userIdMap = new Map<string, number>();
  await Promise.all(
    users.map(async (user) => {
      const node = await neo4jService.findNodeByProperty("User", "id", user.id);
      if (node) {
        userIdMap.set(user.id, node.id);
      }
    })
  );

  return userIdMap;
};

const createConnections = async (
  connections: Connection[],
  userIdMap: Map<string, number>
): Promise<void> => {
  console.log("🔗 Creating connections...");

  await Promise.all(
    connections.map(async (connection) => {
      const fromNodeId = userIdMap.get(connection.user1_id);
      const toNodeId = userIdMap.get(connection.user2_id);

      if (fromNodeId && toNodeId) {
        const exists = await checkConnectionExists(fromNodeId, toNodeId);
        if (!exists) {
          await neo4jService.connectNodes(fromNodeId, toNodeId, "KNOWS", {
            created_at: new Date().toISOString(),
          });
        } else {
          console.log(
            `⚠️ Connection between ${connection.user1_id} and ${connection.user2_id} already exists`
          );
        }
      }
    })
  );
};

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log("🌱 Starting database seeding...");

    const isEmpty = await checkDatabaseEmpty();
    if (!isEmpty) {
      console.log("⚠️ Database is not empty! Checking for missing data...");
    }

    const [users, connections] = await Promise.all([
      getUsers(),
      getConnections(),
    ]);

    const userIdMap = await createUsers(users);

    await createConnections(connections, userIdMap);

    console.log(userIdMap);

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
};

export const getDatabaseStats = async (): Promise<void> => {
  const userCount = await neo4jService.runQuery(`
    MATCH (u:User)
    RETURN count(u) as userCount
  `);

  const connectionCount = await neo4jService.runQuery(`
    MATCH ()-[r:KNOWS]->()
    RETURN count(r) as connectionCount
  `);

  console.log("📊 Database Statistics:");
  console.log(`Users: ${userCount.records[0].get("userCount").toNumber()}`);
  console.log(
    `Connections: ${connectionCount.records[0]
      .get("connectionCount")
      .toNumber()}`
  );
};
