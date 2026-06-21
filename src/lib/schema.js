import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const duelQueue = pgTable("duel_queue", {
  id:          serial("id").primaryKey(),
  clerkId:     text("clerk_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  joinedAt:    timestamp("joined_at",  { withTimezone: true }).defaultNow().notNull(),
  expiresAt:   timestamp("expires_at", { withTimezone: true }).notNull(),
  matchId:     integer("match_id"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const duelMatches = pgTable("duel_matches", {
  id:             serial("id").primaryKey(),
  status:         text("status").default("active").notNull(), // active | completed | abandoned
  startedAt:      timestamp("started_at",  { withTimezone: true }).defaultNow(),
  endsAt:         timestamp("ends_at",     { withTimezone: true }),
  winnerClerkId:  text("winner_clerk_id"),
  challengeSlot:  text("challenge_slot"),   // code filename, e.g. "UserManager.cpp"
  challengeData:  text("challenge_data"),   // JSON of Vulnerabilities object
  createdAt:      timestamp("created_at",  { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at",  { withTimezone: true }).defaultNow(),
});

export const duelMatchPlayers = pgTable("duel_match_players", {
  id:            serial("id").primaryKey(),
  matchId:       integer("match_id").notNull(),
  clerkId:       text("clerk_id").notNull(),
  displayName:   text("display_name").notNull(),
  score:         integer("score").default(0).notNull(),
  categoryIndex: integer("category_index").default(0).notNull(),
  fixedCounts:   text("fixed_counts").default("{}").notNull(), // JSON: {Security:[0,1],...}
  status:        text("status").default("active").notNull(),   // active | finished
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userPresence = pgTable("user_presence", {
  id:             serial("id").primaryKey(),
  clerkId:        text("clerk_id").unique().notNull(),
  state:          text("state").default("idle").notNull(), // idle | queueing | in_match
  currentMatchId: text("current_match_id"),
  lastSeenAt:     timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id:        serial("id").primaryKey(),
  clerkId:   text("clerk_id").unique().notNull(),
  email:     text("email"),
  username:  text("username"),
  firstName: text("first_name"),
  lastName:  text("last_name"),
  imageUrl:  text("image_url"),
  noteText:  text("note_text"),
  bestScore: integer("best_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const follows = pgTable("follows", {
  id:               serial("id").primaryKey(),
  followerClerkId:  text("follower_clerk_id").notNull(),
  followingClerkId: text("following_clerk_id").notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("follows_pair").on(t.followerClerkId, t.followingClerkId),
]);

export const conversations = pgTable("conversations", {
  id:           serial("id").primaryKey(),
  user1ClerkId: text("user1_clerk_id").notNull(),
  user2ClerkId: text("user2_clerk_id").notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("conversations_pair").on(t.user1ClerkId, t.user2ClerkId),
]);

export const messages = pgTable("messages", {
  id:             serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderClerkId:  text("sender_clerk_id").notNull(),
  body:           text("body").notNull(),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── Group Raid (2v2) ──────────────────────────────────────────

export const raidQueue = pgTable("raid_queue", {
  id:          serial("id").primaryKey(),
  clerkId:     text("clerk_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  joinedAt:    timestamp("joined_at",  { withTimezone: true }).defaultNow().notNull(),
  expiresAt:   timestamp("expires_at", { withTimezone: true }).notNull(),
  matchId:     integer("match_id"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const raidMatches = pgTable("raid_matches", {
  id:             serial("id").primaryKey(),
  status:         text("status").default("active").notNull(), // active | completed | abandoned
  codebaseFolder: text("codebase_folder").notNull(),
  startedAt:      timestamp("started_at", { withTimezone: true }).defaultNow(),
  endsAt:         timestamp("ends_at",    { withTimezone: true }),
  winnerTeam:     integer("winner_team"),                     // 0 or 1, null = draw
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const raidMatchPlayers = pgTable("raid_match_players", {
  id:           serial("id").primaryKey(),
  matchId:      integer("match_id").notNull(),
  clerkId:      text("clerk_id").notNull(),
  displayName:  text("display_name").notNull(),
  teamId:       integer("team_id").notNull(),                 // 0 or 1
  totalScore:   integer("total_score").default(0).notNull(),
  fileProgress: text("file_progress").default("{}").notNull(), // JSON: {[path]:{[cat]:{fixed:[],score:0}}}
  status:       text("status").default("active").notNull(),   // active | finished
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
