// Lists the latest error events reported by the app (server and browser).
// Usage: npm run errors [-- --limit 50]   (reads SUPABASE_DB_URL from .env.local)
import pg from "pg";

if (!process.env.SUPABASE_DB_URL) throw new Error("Missing SUPABASE_DB_URL. Check .env.local.");

const limitArg = process.argv.indexOf("--limit");
const limit = Math.min(Number(limitArg > -1 ? process.argv[limitArg + 1] : 20) || 20, 200);

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();
try {
  const { rows: summary } = await db.query(
    `select source, count(*)::int as last_24h
     from private.error_events where created_at > now() - interval '24 hours'
     group by source order by source`,
  );
  const { rows } = await db.query(
    `select to_char(created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as at,
            source, left(message, 90) as message, digest, path, route
     from private.error_events order by created_at desc limit $1`,
    [limit],
  );
  console.log("Last 24 hours:");
  console.table(summary.length ? summary : [{ source: "-", last_24h: 0 }]);
  console.log(`Latest ${rows.length} events:`);
  if (rows.length) console.table(rows);
} finally {
  await db.end();
}
