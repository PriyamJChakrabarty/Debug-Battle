import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

console.log("Adding game columns to duel_matches and duel_match_players…");

await sql`ALTER TABLE duel_matches ADD COLUMN IF NOT EXISTS challenge_slot TEXT`;
await sql`ALTER TABLE duel_matches ADD COLUMN IF NOT EXISTS challenge_data TEXT`;
await sql`ALTER TABLE duel_match_players ADD COLUMN IF NOT EXISTS category_index INTEGER NOT NULL DEFAULT 0`;
await sql`ALTER TABLE duel_match_players ADD COLUMN IF NOT EXISTS fixed_counts TEXT NOT NULL DEFAULT '{}'`;

console.log("Done.");
