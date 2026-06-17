import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:        serial("id").primaryKey(),
  clerkId:   text("clerk_id").unique().notNull(),
  email:     text("email"),
  username:  text("username"),
  firstName: text("first_name"),
  lastName:  text("last_name"),
  imageUrl:  text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
