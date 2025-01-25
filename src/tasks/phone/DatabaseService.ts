import sqlite3 from "sqlite3";

interface Fact {
  id: number;
  content: string;
  documentUuid: string;
}

interface Conversation {
  id: number;
  conversationName: string;
  messages: string;
}

interface ReasoningLog {
  id: number;
  timestamp: string;
  log: string;
}

interface UserInteraction {
  id: number;
  timestamp: string;
  userInput: string;
  agentResponse: string;
}

export class DatabaseService {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  createTables(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS facts (
        id INTEGER PRIMARY KEY,
        content TEXT,
        document_uuid TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY,
        conversation_name TEXT,
        messages TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS reasoning_logs (
        id INTEGER PRIMARY KEY,
        timestamp TEXT,
        log TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY,
        timestamp TEXT,
        user_input TEXT,
        agent_response TEXT
      )
    `);
  }

  insertFact(content: string, documentUuid: string): void {
    this.db.run("INSERT INTO facts (content, document_uuid) VALUES (?, ?)", [
      content,
      documentUuid,
    ]);
  }

  insertConversation(conversationName: string, messages: string): void {
    this.db.run(
      "INSERT INTO conversations (conversation_name, messages) VALUES (?, ?)",
      [conversationName, messages]
    );
  }

  insertReasoningLog(timestamp: string, log: string): void {
    this.db.run("INSERT INTO reasoning_logs (timestamp, log) VALUES (?, ?)", [
      timestamp,
      log,
    ]);
  }

  insertUserInteraction(
    timestamp: string,
    userInput: string,
    agentResponse: string
  ): void {
    this.db.run(
      "INSERT INTO user_interactions (timestamp, user_input, agent_response) VALUES (?, ?, ?)",
      [timestamp, userInput, agentResponse]
    );
  }

  getFacts(): Promise<Fact[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT id, content, document_uuid FROM facts",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Fact[]);
          }
        }
      );
    });
  }

  getConversations(): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT id, conversation_name, messages FROM conversations",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Conversation[]);
          }
        }
      );
    });
  }

  getReasoningLogs(): Promise<ReasoningLog[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT id, timestamp, log FROM reasoning_logs",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as ReasoningLog[]);
          }
        }
      );
    });
  }

  getUserInteractions(): Promise<UserInteraction[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT id, timestamp, user_input, agent_response FROM user_interactions",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as UserInteraction[]);
          }
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}
