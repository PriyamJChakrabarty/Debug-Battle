import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

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
