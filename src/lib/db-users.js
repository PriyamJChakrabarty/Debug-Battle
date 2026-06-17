import { and, asc, desc, eq, lt } from "drizzle-orm";
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

export async function updateBestScore(clerkId, newScore) {
  await db
    .update(users)
    .set({ bestScore: newScore, updatedAt: new Date() })
    .where(and(eq(users.clerkId, clerkId), lt(users.bestScore, newScore)));
}

export async function getLeaderboard(limit = 100) {
  return db
    .select({
      id:        users.id,
      firstName: users.firstName,
      lastName:  users.lastName,
      username:  users.username,
      imageUrl:  users.imageUrl,
      bestScore: users.bestScore,
    })
    .from(users)
    .orderBy(desc(users.bestScore), asc(users.createdAt))
    .limit(limit);
}

export async function getUserByClerkId(clerkId) {
  const rows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

export async function deleteUserByClerkId(clerkId) {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}
