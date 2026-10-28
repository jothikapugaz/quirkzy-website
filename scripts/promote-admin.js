import "dotenv/config";
import pg from "pg";

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run admin:promote -- existing-account@example.com");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Use the intended database and keep its credentials private.");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});
try {
  const result = await pool.query(
    "UPDATE users SET role='admin' WHERE email=$1 RETURNING id,name,email,role",
    [email]
  );
  if (!result.rows[0]) {
    console.error("No account exists for that email. Create the account through the customer registration page first.");
    process.exitCode = 1;
  } else {
    console.log("Administrator role granted to:", result.rows[0].email);
    console.log("Keep this account secure. Admin access is checked against the database on every admin API request.");
  }
} catch (error) {
  console.error("Could not update administrator role:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
