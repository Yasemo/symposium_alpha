import { initDatabase, runMigrations, closeDatabase } from "./connection.ts";

async function main() {
  try {
    console.log("Initializing Symposium database...");
    
    // Initialize database connection
    initDatabase();
    console.log("Database connection established");
    
    // Run migrations
    await runMigrations();
    console.log("Database schema created successfully");
    
    // Close database connection
    closeDatabase();
    console.log("Database initialization complete!");
    
  } catch (error) {
    console.error("Database initialization failed:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
