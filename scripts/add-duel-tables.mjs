import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS duel_queue (
    id           SERIAL PRIMARY KEY,
    clerk_id     TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    match_id     INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS duel_matches (
    id              SERIAL PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'active',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    ends_at         TIMESTAMPTZ,
    winner_clerk_id TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS duel_match_players (
    id           SERIAL PRIMARY KEY,
    match_id     INTEGER NOT NULL,
    clerk_id     TEXT NOT NULL,
    display_name TEXT NOT NULL,
    score        INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
  )
`;

console.log("✓ duel_queue, duel_matches, duel_match_players ready");
