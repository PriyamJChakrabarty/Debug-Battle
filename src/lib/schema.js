import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:        serial("id").primaryKey(),
  clerkId:   text("clerk_id").unique().notNull(),
  email:     text("email"),
  username:  text("username"),
  firstName: text("first_name"),
  lastName:  text("last_name"),
  imageUrl:  text("image_url"),
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
