import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS user_presence (
    id             SERIAL PRIMARY KEY,
    clerk_id       TEXT UNIQUE NOT NULL,
    state          TEXT NOT NULL DEFAULT 'idle',
    current_match_id TEXT,
    last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
  )
`;

console.log("✓ user_presence table ready");
