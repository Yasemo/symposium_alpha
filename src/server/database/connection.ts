import { Database } from "sqlite";

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function initDatabase(path: string = "./symposium.db"): Database {
  if (db) {
    db.close();
  }
  
  db = new Database(path);
  
  // Enable foreign key constraints
  db.exec("PRAGMA foreign_keys = ON");
  
  // Set WAL mode for better concurrency
  db.exec("PRAGMA journal_mode = WAL");
  
  // Optimize SQLite settings
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA cache_size = 1000");
  db.exec("PRAGMA temp_store = MEMORY");
  
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Helper function to run migrations
export async function runMigrations(): Promise<void> {
  const database = getDatabase();
  
  // Read and execute schema
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schema = await Deno.readTextFile(schemaPath);
  
  // Split schema into individual statements and execute
  const statements = schema
    .split(";")
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  for (const statement of statements) {
    try {
      database.exec(statement);
    } catch (error) {
      // Ignore "table already exists" errors
      if (error instanceof Error && !error.message.includes("already exists")) {
        throw error;
      }
    }
  }
  
  console.log("Database migrations completed successfully");
}

// Helper function to check if database is initialized
export function isDatabaseInitialized(): boolean {
  if (!db) return false;
  
  try {
    // Check if users table exists
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).all();
    return result.length > 0;
  } catch {
    return false;
  }
}
