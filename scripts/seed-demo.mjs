// Creates (or resets) the shared demo account with six months of sample data.
// Usage: npm run seed:demo   (reads .env.local)
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: secretKey,
  SUPABASE_DB_URL: dbUrl,
  DEMO_EMAIL: email,
  DEMO_PASSWORD: password,
} = process.env;

for (const [name, value] of Object.entries({ url, secretKey, dbUrl, email, password })) {
  if (!value) throw new Error(`Missing env var for ${name}. Check .env.local.`);
}

const admin = createClient(url, secretKey, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 200) return user;
  }
}

let user = await findUser();
if (user) {
  // Changing a password signs out every session, so only touch it when .env.local changed it.
  const probe = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await probe.auth.signInWithPassword({ email, password });
  if (signInError) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    console.log(`Demo user found: ${email} (password updated)`);
  } else {
    await probe.auth.signOut({ scope: "local" });
    console.log(`Demo user found: ${email}`);
  }
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Visitante" },
  });
  if (error) throw error;
  user = data.user;
  console.log(`Demo user created: ${email}`);
}

const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
try {
  await db.query("select private.seed_demo_data($1)", [user.id]);
  await db.query("select private.seed_demo_investments($1)", [user.id]);
  await db.query("select private.seed_demo_fixed_income($1)", [user.id]);
  const { rows } = await db.query(
    `select type, count(*)::int as count, sum(amount)::numeric(14,2) as total
     from public.transactions where user_id = $1 group by type order by type`,
    [user.id],
  );
  console.log("Demo data seeded:");
  console.table(rows);
} finally {
  await db.end();
}
