// Applies pending migrations in supabase/migrations to the remote database.
// Usage: npm run db:push   (reads SUPABASE_DB_URL from .env.local)
import { spawnSync } from "node:child_process";

if (!process.env.SUPABASE_DB_URL) throw new Error("Missing SUPABASE_DB_URL. Check .env.local.");

const result = spawnSync("npx", ["supabase", "db", "push", "--db-url", process.env.SUPABASE_DB_URL, "--yes"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
