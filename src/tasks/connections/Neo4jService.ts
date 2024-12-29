import neo4j, {
  Driver,
  Result,
  Session,
  Integer,
  Record as Neo4jRecord,
} from "neo4j-driver";

export class Neo4jService {
  private driver: Driver;

  constructor(uri: string, username: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async runQuery(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<Result> {
    const session: Session = this.driver.session();

    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  async executeQuery(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<Result> {
    return this.runQuery(cypher, params);
  }

  async addNode(
    label: string,
    properties: Record<string, any>
  ): Promise<{ id: number; properties: Record<string, any> }> {
    const cypher = `
        CREATE (n:${label} $properties)
        RETURN id(n) AS id, n
        `;

    const result = await this.runQuery(cypher, { properties });

    return {
      id: (result.records[0].get("id") as Integer).toNumber(),
      properties: result.records[0].get("n").properties,
    };
  }

  async batchAddNodes(
    label: string,
    nodesList: Record<string, any>[]
  ): Promise<Record<string, any>[]> {
    const cypher = `
      UNWIND $nodesList AS node
      CREATE (n:${label})
      SET n += node
      RETURN n
    `;
    const result = await this.runQuery(cypher, { nodesList });
    return result.records.map((record) => record.get("n").properties);
  }

  async getNodeById(
    nodeId: string,
    properties: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const cypher = `
        MATCH (n)
        WHERE id(n) = $nodeId
        SET n += $properties
        RETURN n
        `;

    const result = await this.runQuery(cypher, { nodeId, properties });

    return result.records[0].get("n").properties;
  }

  async deleteNode(nodeId: string): Promise<boolean> {
    const cypher = `
        MATCH (n)
        WHERE id(n) = $nodeId
        DETACH DELETE n
        `;

    await this.runQuery(cypher, { nodeId });
    return true;
  }

  async connectNodes(
    fromNodeId: number,
    toNodeId: number,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const cypher = `
        MATCH (a), (b)
        WHERE id(a) = $fromNodeId AND id(b) = $toNodeId
        CREATE (a)-[r:${relationshipType} $properties]->(b)
        RETURN r
        `;

    await this.runQuery(cypher, {
      fromNodeId: neo4j.int(fromNodeId),
      toNodeId: neo4j.int(toNodeId),
      properties,
    });
  }

  async findNodeByProperty(
    label: string,
    propertyName: string,
    propertyValue: any
  ): Promise<{ id: number; properties: Record<string, any> } | null> {
    const cypher = `
        MATCH (n:${label} {${propertyName}: $propertyValue})
        RETURN id(n) AS id, n
        `;

    const result = await this.runQuery(cypher, { propertyValue });
    if (result.records.length === 0) {
      return null;
    }
    const record = result.records[0];

    return {
      id: (record.get("id") as Integer).toNumber(),
      properties: record.get("n").properties,
    };
  }

  async findNodesByProperty(
    label: string,
    propertyName: string,
    propertyValue: any
  ): Promise<Array<{ id: number; properties: Record<string, any> }>> {
    const cypher = `
      MATCH (n:${label} {${propertyName}: $propertyValue})
      RETURN id(n) AS id, n
    `;
    const result = await this.runQuery(cypher, { propertyValue });
    return result.records.map((record: Neo4jRecord) => ({
      id: (record.get("id") as Integer).toNumber(),
      properties: record.get("n").properties,
    }));
  }

  async getNodeRelationships(
    nodeId: number,
    direction: "INCOMING" | "OUTGOING" | "BOTH" = "BOTH"
  ): Promise<
    Array<{
      relationshipType: string;
      relationship: Record<string, any>;
      relatedNode: Record<string, any>;
    }>
  > {
    if (!nodeId) {
      throw new Error("nodeId is required for getNodeRelationships");
    }
    console.log("Getting relationships for nodeId:", nodeId);

    const directionClause =
      direction === "INCOMING"
        ? "<-[r]-"
        : direction === "OUTGOING"
        ? "-[r]->"
        : "-[r]-";

    const cypher = `
      MATCH (n)${directionClause}(related)
      WHERE id(n) = $nodeId
      RETURN type(r) AS relationshipType, r AS relationship, related
    `;

    const result = await this.runQuery(cypher, {
      nodeId: neo4j.int(nodeId),
    });

    return result.records.map((record) => ({
      relationshipType: record.get("relationshipType"),
      relationship: record.get("relationship").properties,
      relatedNode: record.get("related").properties,
    }));
  }

  async queryByRelationship(
    fromType: string,
    relationType: string,
    toType: string
  ): Promise<
    Array<{
      from: Record<string, any>;
      to: Record<string, any>;
      relationship: Record<string, any>;
    }>
  > {
    const cypher = `
      MATCH (from:${fromType})-[r:${relationType}]->(to:${toType})
      RETURN from, r, to
    `;
    const result = await this.runQuery(cypher);
    return result.records.map((record: Neo4jRecord) => ({
      from: record.get("from").properties,
      to: record.get("to").properties,
      relationship: record.get("r").properties,
    }));
  }

  // New method for flexible property-based querying
  async queryByProperties(
    label: string,
    properties: Record<string, any>
  ): Promise<Array<{ id: number; properties: Record<string, any> }>> {
    const conditions = Object.entries(properties)
      .map(([key, _]) => `n.${key} = $${key}`)
      .join(" AND ");

    const cypher = `
      MATCH (n:${label})
      WHERE ${conditions}
      RETURN id(n) AS id, n
    `;

    const result = await this.runQuery(cypher, properties);
    return result.records.map((record: Neo4jRecord) => ({
      id: (record.get("id") as Integer).toNumber(),
      properties: record.get("n").properties,
    }));
  }

  async facetedSearch(
    documentType: string,
    limit: number = 10,
    relationship: string | null = null
  ): Promise<Record<string, any>[]> {
    // Ensure limit is an integer using neo4j.int()
    const intLimit = neo4j.int(Math.floor(limit));

    let cypher = `
      MATCH (n:Document)
      WHERE n.type = $documentType
    `;

    if (relationship) {
      cypher += `
        OPTIONAL MATCH (n)-[:${relationship}]->(related)
        WITH n, collect(related) as relatedNodes
      `;
    } else {
      cypher += `
        WITH n, [] as relatedNodes
      `;
    }

    cypher += `
      RETURN n as node, relatedNodes
      LIMIT toInteger($limit)
    `;

    const result = await this.runQuery(cypher, {
      documentType,
      limit: intLimit,
    });
    return result.records.map((record) => ({
      node: record.get("node").properties,
      relatedNodes: record
        .get("relatedNodes")
        .map((node: any) => node?.properties || null)
        .filter(Boolean),
    }));
  }

  async checkIndexExists(indexName: string): Promise<boolean> {
    const cypher = `
      SHOW INDEXES
      WHERE name = $indexName
    `;
    const result = await this.runQuery(cypher, { indexName });
    return result.records.length > 0;
  }

  async waitForIndexToBeOnline(
    indexName: string,
    maxWaitTimeMs: number = 30000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTimeMs) {
      const exists = await this.checkIndexExists(indexName);
      if (exists) {
        console.log(`Index '${indexName}' is online.`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    }
    throw new Error(`Timeout waiting for index '${indexName}' to come online.`);
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}