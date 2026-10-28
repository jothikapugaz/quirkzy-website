import "dotenv/config";
import pg from "pg";
import { createApp } from "./lib/app.js";

const { Pool } = pg;
const port = Number(process.env.PORT) || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
pool.on("error", (error) => console.error("Unexpected PostgreSQL pool error:", error.message));

const app = createApp({ pool });
const server = app.listen(port, () => console.log(`Quirkzy is running at http://localhost:${port}`));

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down Quirkzy...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
