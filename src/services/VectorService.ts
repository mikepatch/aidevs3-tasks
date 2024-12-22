import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenaiProvider } from "./OpenaiProvider";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

type Point = {
  text: string;
  id?: string;
  metadata?: Record<string, any>;
};

export class VectorService {
  private client: QdrantClient;
  private openAIService: OpenaiProvider;

  constructor(openAIService: OpenaiProvider) {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.openAIService = openAIService;
  }

  async collectionExists(name: string): Promise<boolean> {
    try {
      const { collections } = await this.client.getCollections();
      return collections.some((c) => c.name === name);
    } catch (error) {
      console.error("Error checking collection existence:", error);
      throw error;
    }
  }

  async ensureCollection(name: string) {
    try {
      const { collections } = await this.client.getCollections();

      if (!collections.some((c) => c.name === name)) {
        await this.client.createCollection(name, {
          vectors: { size: 3072, distance: "Cosine" },
        });
      }
    } catch (error) {
      console.error("Error during ensuring collection:", error);
      throw error;
    }
  }

  async initializeCollectionWithData(
    name: string,
    points: Point[],
    outputPointsPath: string
  ) {
    try {
      const { collections } = await this.client.getCollections();

      if (!collections.some((c) => c.name === name)) {
        await this.ensureCollection(name);
        await this.addPoints(name, points, outputPointsPath);
      }
    } catch (error) {
      console.error("Error during initializing collection:", error);
      throw error;
    }
  }

  async addPoints(
    collectionName: string,
    points: Point[],
    outputPointsPath: string
  ) {
    try {
      const pointsToUpsert = await Promise.all(
        points.map(async (point) => {
          const embedding = await this.openAIService.createEmbedding(
            point.text
          );

          return {
            id: point.id || uuidv4(),
            vector: embedding,
            payload: {
              text: point.text,
              ...point.metadata,
            },
          };
        })
      );

      const pointsFilePath = path.join(outputPointsPath, "points.json");
      await fs.writeFile(
        pointsFilePath,
        JSON.stringify(pointsToUpsert, null, 2)
      );

      await this.client.upsert(collectionName, {
        wait: true,
        points: pointsToUpsert,
      });
    } catch (error) {
      console.error("Error during adding points to collection:", error);
      throw error;
    }
  }

  async performSearch(
    collectionName: string,
    query: string,
    filter: Record<string, any> = {},
    limit: number = 5
  ) {
    try {
      const queryEmbedding = await this.openAIService.createEmbedding(query);

      const searchParams = {
        vector: queryEmbedding,
        limit,
        with_payload: true,
        ...(Object.keys(filter).length > 0 ? { filter } : {}), // Only include filter if not empty
      };

      const result = await this.client.search(collectionName, searchParams);

      return result;
    } catch (error) {
      console.error("Error during performing search:", error);
      throw error;
    }
  }
}
