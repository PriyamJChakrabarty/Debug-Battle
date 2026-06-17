import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "url";
import { dirname } from "path";

loadEnvConfig(dirname(fileURLToPath(import.meta.url)) + "/..");

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS note_text TEXT`;
console.log("✓ note_text column added to users");

await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'conversations_pair'
    ) THEN
      ALTER TABLE conversations ADD CONSTRAINT conversations_pair UNIQUE (user1_clerk_id, user2_clerk_id);
    END IF;
  END $$
`;
console.log("✓ conversations_pair constraint ensured");

process.exit(0);
