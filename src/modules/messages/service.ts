import { db } from "@/lib/db";

export function getUserMessages(userId: string) {
  return db.message.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" },
  });
}
