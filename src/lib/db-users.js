import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export async function upsertUser({ clerkId, email, firstName, lastName, imageUrl, username }) {
  const rows = await db
    .insert(users)
    .values({ clerkId, email: email ?? null, firstName: firstName ?? null, lastName: lastName ?? null, imageUrl: imageUrl ?? null, username: username ?? null })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email:     email     ?? null,
        firstName: firstName ?? null,
        lastName:  lastName  ?? null,
        imageUrl:  imageUrl  ?? null,
        username:  username  ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

export async function deleteUserByClerkId(clerkId) {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}
