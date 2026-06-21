import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

// Parse .env.local manually (no dotenv dependency)
try {
  const env = readFileSync(".env.local", "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Add teamGroupId column to existing raid_queue table
  await sql`
    ALTER TABLE raid_queue
    ADD COLUMN IF NOT EXISTS team_group_id TEXT
  `;
  console.log("✓ raid_queue.team_group_id ready");

  // Create raid_invitations table
  await sql`
    CREATE TABLE IF NOT EXISTS raid_invitations (
      id               SERIAL PRIMARY KEY,
      inviter_clerk_id TEXT        NOT NULL,
      invitee_clerk_id TEXT        NOT NULL,
      inviter_name     TEXT        NOT NULL,
      invitee_name     TEXT        NOT NULL,
      status           TEXT        NOT NULL DEFAULT 'pending',
      team_group_id    TEXT,
      expires_at       TIMESTAMPTZ NOT NULL,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_raid_invitations_invitee
      ON raid_invitations (invitee_clerk_id, status, expires_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_raid_invitations_inviter
      ON raid_invitations (inviter_clerk_id, status)
  `;
  console.log("✓ raid_invitations ready");
}

main().catch((err) => { console.error(err); process.exit(1); });
