// Regenerates src/lib/supabase/database.types.ts from the remote schema.
// Usage: npm run db:types   (reads SUPABASE_DB_URL from .env.local)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const OUTPUT = "src/lib/supabase/database.types.ts";
const shell = process.platform === "win32";

if (!process.env.SUPABASE_DB_URL) throw new Error("Missing SUPABASE_DB_URL. Check .env.local.");

const types = execFileSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--db-url", process.env.SUPABASE_DB_URL, "--schema", "public"],
  { encoding: "utf8", shell, stdio: ["ignore", "pipe", "inherit"] },
);
writeFileSync(OUTPUT, types);
execFileSync("npx", ["--yes", "oxfmt", OUTPUT], { stdio: "inherit", shell });
console.log(`Wrote ${OUTPUT}`);
